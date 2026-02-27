const httpProxy = require("http-proxy");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config();

const proxy = httpProxy.createProxyServer({});

const GHOST = process.env.GHOST_INTERNAL_URL;
const NEXTJS = process.env.NEXTJS_INTERNAL_URL;

(() => {
  if (!GHOST || !NEXTJS) {
    console.error(
      "Error: GHOST_INTERNAL_URL and NEXTJS_INTERNAL_URL must be set in the environment.",
    );
    process.exit(1);
    return;
  }

  proxy.on("error", (err, req, res) => {
    console.error(`[proxy error] ${req.method} ${req.url} — ${err.message}`);
    res.writeHead(502);
    res.end("Bad gateway");
  });

  const server = http.createServer((req, res) => {
    const target =
      req.url.startsWith("/ghost") || req.url.startsWith("/content/images")
        ? GHOST
        : NEXTJS;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} → ${target}`,
    );
    proxy.web(req, res, { target });
  });

  server.listen(process.env.PORT || 8080, () => {
    console.log(`Proxy running on port ${process.env.PORT || 8080}`);
    console.log(`Ghost: ${GHOST}`);
    console.log(`Next.js: ${NEXTJS}`);
  });
})();
