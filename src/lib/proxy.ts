import { logResponse, logError, logFrameOverride } from "./logger.js";
import httpProxy from "http-proxy";

export const proxy = httpProxy.createProxyServer({
  secure: false, // Internal services may use self-signed certs
});

// Set forwarding headers on every proxied request.
// Per-route headers (via proxy.web `headers` option) are applied before this
// event fires — only set defaults if the route didn't already provide a value.
proxy.on("proxyReq", (proxyReq, req) => {
  const host = req.headers.host ?? "";

  const remoteIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "";

  if (!proxyReq.getHeader("x-forwarded-host")) {
    proxyReq.setHeader("X-Forwarded-Host", host);
  }

  if (!proxyReq.getHeader("x-forwarded-proto")) {
    proxyReq.setHeader("X-Forwarded-Proto", "https");
  }

  proxyReq.setHeader("X-Forwarded-For", remoteIp);
  proxyReq.setHeader("X-Real-IP", remoteIp);
});

const ALLOWED_FRAME_ORIGINS = [
  "localhost",
  "atlas-cms.rest",
  "iliad.dev",
];

function isAllowedFrameOrigin(originHeader: string | undefined): boolean {
  if (!originHeader) return false;
  try {
    const { hostname } = new URL(originHeader);
    return ALLOWED_FRAME_ORIGINS.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );
  } catch {
    return false;
  }
}

// Resolve the effective origin from the request, falling back to the Referer
// header. Iframe navigations do not include an Origin header, so Referer is
// the only signal available.
function resolveOrigin(req: {
  headers: Record<string, string | string[] | undefined>;
}): string | undefined {
  const origin = req.headers["origin"] as string | undefined;
  if (origin) return origin;

  const referer = req.headers["referer"] as string | undefined;
  if (!referer) return undefined;
  try {
    const { origin: o } = new URL(referer);
    return o;
  } catch {
    return undefined;
  }
}

proxy.on("proxyRes", (proxyRes, req) => {
  logResponse(req.method ?? "?", req.url ?? "/", proxyRes.statusCode ?? 0);

  const origin = resolveOrigin(req as any);
  if (isAllowedFrameOrigin(origin)) {
    logFrameOverride(origin!, req.url ?? "/");
    // X-Frame-Options ALLOW-FROM is not supported in modern browsers.
    // Delete it and rely on the CSP frame-ancestors directive instead.
    delete proxyRes.headers["x-frame-options"];
    proxyRes.headers["content-security-policy"] =
      `frame-ancestors 'self' ${origin}`;
    proxyRes.headers["access-control-allow-origin"] = origin;
    proxyRes.headers["access-control-allow-credentials"] = "true";
  }
});

proxy.on("error", (err, req, res) => {
  logError(req.method ?? "?", req.url ?? "/", err.message);

  if ("writeHead" in res && typeof res.writeHead === "function") {
    res.writeHead(502);
    res.end("Bad gateway");
  }
});
