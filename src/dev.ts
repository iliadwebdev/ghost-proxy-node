import chalk from "chalk";

import { checkTargets } from "./lib/healthcheck.js";
import { logRequest } from "./lib/logger.js";
import { logStartup } from "./lib/logger.js";
import { proxy } from "./lib/proxy.js";

import { loadDevConfig } from "./config.js";
import { createServer } from "./server.js";

import type { IncomingMessage, ServerResponse } from "http";

const config = loadDevConfig();

const nextjsUrl = config.DEV_NEXTJS_URL;

if (!nextjsUrl) {
  console.warn(
    chalk.yellow.bold(
      "Running dev in Ghost-only mode — DEV_NEXTJS_URL is not set, so all non-Ghost traffic will be sent to PROXY_TARGET.",
    ),
  );
}

const rewritePatterns = [/\.ghost\/analytics/, /\.ghost\/activitypub/];
const ghostPatterns = [/^\/ghost/, /^\/content\//];
const wellKnownPatterns = [
  /^\/.well-known\/webfinger/,
  /^\/.well-known\/nodeinfo/,
];

function isGhostRequest(url: string): boolean {
  return (
    wellKnownPatterns.some((p) => p.test(url)) ||
    rewritePatterns.some((p) => p.test(url)) ||
    ghostPatterns.some((p) => p.test(url))
  );
}

function devProxyRoute(req: IncomingMessage, res: ServerResponse): boolean {
  const url = req.url ?? "/";

  if (!nextjsUrl || isGhostRequest(url)) {
    logRequest(req.method ?? "?", url, "production proxy");
    proxy.web(req, res, { target: config.PROXY_TARGET });
  } else {
    logRequest(req.method ?? "?", url, "local nextjs");
    proxy.web(req, res, { target: nextjsUrl });
  }

  return true;
}

const targets: Record<string, string> = {
  "Production proxy": config.PROXY_TARGET,
  ...(nextjsUrl ? { "Local Next.js": nextjsUrl } : {}),
};

await checkTargets(targets);

const server = createServer([devProxyRoute]);

server.on("upgrade", (req, socket, head) => {
  const url = req.url ?? "/";
  const target =
    !nextjsUrl || isGhostRequest(url) ? config.PROXY_TARGET : nextjsUrl;

  logRequest("WS", url, target);

  proxy.ws(req, socket, head, { target });
});

server.listen(config.DEV_PORT, () => {
  logStartup(config.DEV_PORT, targets);
});
