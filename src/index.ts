import { checkTargets } from "./lib/healthcheck.js";
import { loadProductionConfig } from "./config.js";
import { logStartup } from "./lib/logger.js";
import { createServer } from "./server.js";

// Routers
import { activityPubRoute } from "./routes/activitypub.js";
import { analyticsRoute } from "./routes/analytics.js";
import { nextjsRoute } from "./routes/nextjs.js";
import { ghostRoute } from "./routes/ghost.js";

const config = loadProductionConfig();

const targets: Record<string, string> = {
  ActivityPub: config.ACTIVITYPUB_PROXY_TARGET,
  Analytics: config.ANALYTICS_PROXY_TARGET,
  "Next.js": config.NEXTJS_INTERNAL_URL,
  Ghost: config.GHOST_INTERNAL_URL,
};

await checkTargets(targets);

const server = createServer([
  activityPubRoute(config.ACTIVITYPUB_PROXY_TARGET),
  analyticsRoute(config.ANALYTICS_PROXY_TARGET),
  nextjsRoute(config.NEXTJS_INTERNAL_URL),
  ghostRoute(config.GHOST_INTERNAL_URL),
]);

server.listen(config.PORT, () => {
  logStartup(config.PORT, targets);
});
