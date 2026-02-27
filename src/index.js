const httpProxy = require("http-proxy");
const dotenv = require("dotenv");
const http = require("http");

dotenv.config();

const proxy = httpProxy.createProxyServer({});

const GHOST = process.env.GHOST_INTERNAL_URL;
const NEXTJS = process.env.NEXTJS_INTERNAL_URL;

function checkTarget(name, url, timeout = 5000) {
  return new Promise((resolve) => {
    const { hostname, port, protocol } = new URL(url);
    const req = http.request(
      { hostname, port: port || (protocol === "https:" ? 443 : 80), path: "/", method: "HEAD", timeout },
      (res) => {
        res.resume();
        console.log(`  ✓ ${name} (${url}) — status ${res.statusCode}`);
        resolve(true);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      console.warn(`  ✗ ${name} (${url}) — timed out after ${timeout}ms`);
      resolve(false);
    });
    req.on("error", (err) => {
      console.warn(`  ✗ ${name} (${url}) — ${err.message}`);
      resolve(false);
    });
    req.end();
  });
}

async function checkTargets() {
  console.log("Checking proxy targets…");
  const results = await Promise.all([
    checkTarget("Ghost", GHOST),
    checkTarget("Next.js", NEXTJS),
  ]);
  if (results.every(Boolean)) {
    console.log("All targets reachable.");
  } else {
    console.warn("Some targets are unreachable — proxy will start anyway.");
  }
}

(async () => {
  if (!GHOST || !NEXTJS) {
    console.error(
      "Error: GHOST_INTERNAL_URL and NEXTJS_INTERNAL_URL must be set in the environment.",
    );
    process.exit(1);
    return;
  }

  await checkTargets();

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
