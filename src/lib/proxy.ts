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

proxy.on("proxyRes", (proxyRes, req) => {
  logResponse(req.method ?? "?", req.url ?? "/", proxyRes.statusCode ?? 0);

  const origin = req.headers["origin"] as string | undefined;
  if (isAllowedFrameOrigin(origin)) {
    logFrameOverride(origin!, req.url ?? "/");
    proxyRes.headers["x-frame-options"] = `ALLOW-FROM ${origin}`;
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
