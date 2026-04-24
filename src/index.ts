import chalk from "chalk";

import { checkTargets } from "./lib/healthcheck.js";
import { logStartup } from "./lib/logger.js";

import { loadProductionConfig } from "./config.js";
import { createServer } from "./server.js";

// Routers
import { ghostRoute, ghostCatchallRoute } from "./routes/ghost.js";
import { ghostFrontendRoute } from "./routes/ghostFrontend.js";
import { activityPubRoute } from "./routes/activitypub.js";
import { wellKnownRoute } from "./routes/wellknown.js";
import { analyticsRoute } from "./routes/analytics.js";
import { nextjsRoute } from "./routes/nextjs.js";

// Types
import type { RouteHandler } from "./server.js";

const config = loadProductionConfig();

const { NEXTJS_INTERNAL_URL: nextjsUrl } = config;

if (!nextjsUrl) {
  console.warn(
    chalk.yellow.bold(
      "Running in Ghost-only mode — NEXTJS_INTERNAL_URL is not set, so all non-Ghost traffic will be served by Ghost.",
    ),
  );
}

const targets: Record<string, string> = {
  ActivityPub: config.ACTIVITYPUB_PROXY_TARGET,
  Ghost: config.GHOST_INTERNAL_URL,
};

if (nextjsUrl) {
  targets["Next.js"] = nextjsUrl;
}

await checkTargets(targets);

// ORDER IS IMPORTANT — specific routes first, catch-all last
const routeHandlers: RouteHandler[] = [
  wellKnownRoute(config.ACTIVITYPUB_PROXY_TARGET),
  activityPubRoute(config.ACTIVITYPUB_PROXY_TARGET),
  analyticsRoute(config.ANALYTICS_PROXY_TARGET),
  ghostRoute(config.GHOST_INTERNAL_URL, config.ATLAS_PANEL_URL),
];

const nextjsHandlers: RouteHandler[] = (() => {
  if (!nextjsUrl) {
    return [ghostCatchallRoute(config.GHOST_INTERNAL_URL)];
  }

  return [
    // ORDER IS IMPORTANT — the ghostFrontendRoute must come before the nextjsRoute to avoid conflicts.
    ghostFrontendRoute(config.GHOST_INTERNAL_URL),
    nextjsRoute(nextjsUrl),
  ];
})();

routeHandlers.push(...nextjsHandlers);

const server = createServer(routeHandlers);

server.listen(config.PORT, () => {
  logStartup(config.PORT, targets);
});
