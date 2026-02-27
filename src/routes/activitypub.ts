import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

const pattern = /\.ghost\/activitypub(\/|$)/;

export function activityPubRoute(target: string, proxyInternalHost: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (!pattern.test(req.url ?? "")) return false;

    // Do NOT rewrite the URL — the ActivityPub service expects the full path.
    // Override Host to the proxy's internal URL so the ActivityPub service
    // fetches JWKS via internal networking instead of the public domain.
    logRequest(req.method ?? "?", req.url ?? "/", "activitypub");
    proxy.web(req, res, {
      target,
      headers: {
        host: proxyInternalHost,
        "x-forwarded-host": proxyInternalHost,
        "x-forwarded-proto": "http",
      },
    });
    return true;
  };
}
