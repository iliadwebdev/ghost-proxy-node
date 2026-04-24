import chalk from "chalk";

import { checkTargets } from "./lib/healthcheck.js";
import { logStartup } from "./lib/logger.js";

import { loadProductionConfig } from "./config.js";
import { createServer } from "./server.js";

// Routers
import { activityPubRoute } from "./routes/activitypub.js";
import { wellKnownRoute } from "./routes/wellknown.js";
import { analyticsRoute } from "./routes/analytics.js";
import { nextjsRoute } from "./routes/nextjs.js";
import { ghostFrontendRoute } from "./routes/ghostFrontend.js";
import { ghostRoute, ghostCatchallRoute } from "./routes/ghost.js";

const config = loadProductionConfig();

const nextjsUrl = config.NEXTJS_INTERNAL_URL;

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
  ...(nextjsUrl ? { "Next.js": nextjsUrl } : {}),
};

await checkTargets(targets);

// ORDER IS IMPORTANT — specific routes first, catch-all last
const server = createServer([
  wellKnownRoute(config.ACTIVITYPUB_PROXY_TARGET),
  activityPubRoute(config.ACTIVITYPUB_PROXY_TARGET),
  analyticsRoute(config.ANALYTICS_PROXY_TARGET),
  ghostRoute(config.GHOST_INTERNAL_URL, config.ATLAS_PANEL_URL),
  ...(nextjsUrl ? [ghostFrontendRoute(config.GHOST_INTERNAL_URL)] : []),
  nextjsUrl
    ? nextjsRoute(nextjsUrl)
    : ghostCatchallRoute(config.GHOST_INTERNAL_URL),
]);

server.listen(config.PORT, () => {
  logStartup(config.PORT, targets);
});
