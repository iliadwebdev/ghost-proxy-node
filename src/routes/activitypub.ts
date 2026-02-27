import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

const pattern = /\.ghost\/activitypub(\/|$)/;

export function activityPubRoute(target: string, ghostInternalHost: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (!pattern.test(req.url ?? "")) return false;

    // Do NOT rewrite the URL — the ActivityPub service expects the full path.
    // Override Host to Ghost's internal URL so the ActivityPub service fetches
    // JWKS directly from Ghost via internal networking (avoids public hairpin).
    logRequest(req.method ?? "?", req.url ?? "/", "activitypub");
    proxy.web(req, res, {
      target,
      headers: {
        host: ghostInternalHost,
        "x-forwarded-host": ghostInternalHost,
        "x-forwarded-proto": "http",
      },
    });
    return true;
  };
}
