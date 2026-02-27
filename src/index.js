const httpProxy = require("http-proxy");
const dotenv = require("dotenv");
const chalk = require("chalk");
const http = require("http");

dotenv.config();

const proxy = httpProxy.createProxyServer({});

const NEXTJS = process.env.NEXTJS_INTERNAL_URL;
const GHOST = process.env.GHOST_INTERNAL_URL;

function checkTarget(name, url, timeout = 5000) {
  return new Promise((resolve) => {
    const { hostname, port, protocol } = new URL(url);
    const req = http.request(
      {
        hostname,
        port: port || (protocol === "https:" ? 443 : 80),
        path: "/",
        method: "HEAD",
        timeout,
      },
      (res) => {
        res.resume();
        console.log(
          chalk.green(`  ✓ ${name}`) +
            chalk.gray(` (${url}) — status ${res.statusCode}`),
        );
        resolve(true);
      },
    );
    req.on("timeout", () => {
      req.destroy();
      console.warn(
        chalk.red(`  ✗ ${name}`) +
          chalk.gray(` (${url}) — timed out after ${timeout}ms`),
      );
      resolve(false);
    });
    req.on("error", (err) => {
      console.warn(
        chalk.red(`  ✗ ${name}`) + chalk.gray(` (${url}) — ${err.message}`),
      );
      resolve(false);
    });
    req.end();
  });
}

async function checkTargets() {
  console.log(chalk.bold("Checking proxy targets…"));
  const results = await Promise.all([
    checkTarget("Ghost", GHOST),
    checkTarget("Next.js", NEXTJS),
  ]);
  if (results.every(Boolean)) {
    console.log(chalk.green.bold("All targets reachable."));
  } else {
    console.warn(
      chalk.yellow.bold(
        "Some targets are unreachable — proxy will start anyway.",
      ),
    );
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

  proxy.on("proxyRes", (proxyRes, req) => {
    const status = proxyRes.statusCode;
    const colorStatus =
      status < 300
        ? chalk.green(status)
        : status < 400
          ? chalk.cyan(status)
          : status < 500
            ? chalk.yellow(status)
            : chalk.red(status);
    console.log(
      chalk.gray(`[${new Date().toISOString()}]`) +
        ` ${req.method} ${req.url} ${chalk.gray("←")} ${colorStatus}`,
    );
  });

  proxy.on("error", (err, req, res) => {
    console.error(
      chalk.red.bold("[proxy error]") +
        ` ${req.method} ${req.url} — ${chalk.red(err.message)}`,
    );
    res.writeHead(502);
    res.end("Bad gateway");
  });

  const server = http.createServer((req, res) => {
    const target =
      req.url.startsWith("/ghost") || req.url.startsWith("/content/images")
        ? GHOST
        : NEXTJS;

    console.log(
      chalk.gray(`[${new Date().toISOString()}]`) +
        ` ${chalk.bold(req.method)} ${req.url} ${chalk.gray("→")} ${chalk.cyan(target)}`,
    );
    proxy.web(req, res, { target });
  });

  server.listen(process.env.PORT || 8080, () => {
    console.log(
      chalk.green.bold(`Proxy running on port ${process.env.PORT || 8080}`),
    );
    console.log(`  Ghost:   ${chalk.cyan(GHOST)}`);
    console.log(`  Next.js: ${chalk.cyan(NEXTJS)}`);
  });
})();
