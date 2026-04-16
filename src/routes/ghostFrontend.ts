import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

/**
 * This allows a call from the Next.js frontend to circumvent the typical proxy so that we can detect the current version of the Ghost installation.
 * This allows the frontend to request matching scripts from a CDN.
 */
export function ghostFrontendRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    if (req.url !== "/__ghost-frontend") return false;

    req.url = "/";
    logRequest(req.method ?? "?", "/__ghost-frontend → /", "ghost-frontend");
    proxy.web(req, res, { target });

    return true;
  };
}
