import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

/**
 * This allows a call from the Next.js frontend to circumvent the typical proxy so that we can detect the current version of the Ghost installation.
 * This allows the frontend to request matching scripts from a CDN.
 */
const PREFIX = "/__ghost-frontend";

export function ghostFrontendRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (!req.url?.startsWith(PREFIX)) return false;

    const forwarded = req.url.slice(PREFIX.length) || "/";
    logRequest(req.method ?? "?", `${PREFIX} → ${forwarded}`, "ghost-frontend");

    req.url = forwarded;
    proxy.web(req, res, { target });

    return true;
  };
}
