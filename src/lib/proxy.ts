import { logResponse, logError } from "./logger.js";
import httpProxy from "http-proxy";

export const proxy = httpProxy.createProxyServer({
  changeOrigin: true, // The origin should be changed to the target URL.
  secure: false, // Because we are proxying to internal services via HTTP, we don't want to reject self-signed certs. Is this a security risk?
});

proxy.on("proxyRes", (proxyRes, req) => {
  logResponse(req.method ?? "?", req.url ?? "/", proxyRes.statusCode ?? 0);
});

proxy.on("error", (err, req, res) => {
  logError(req.method ?? "?", req.url ?? "/", err.message);

  if ("writeHead" in res && typeof res.writeHead === "function") {
    res.writeHead(502);
    res.end("Bad gateway");
  }
});
