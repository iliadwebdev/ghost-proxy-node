import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

export function ghostRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? "/";
    const isGhostPath =
      url.startsWith("/ghost") ||
      url.startsWith("/content/images") ||
      url.startsWith("/members/api") ||
      (url.startsWith("/members/") && url.includes("token="));

    if (!isGhostPath) {
      return false;
    }

    // Next.js relative chunk URLs can resolve under /ghost/…/_next/…
    // These must fall through to the Next.js route, not Ghost.
    if (url.includes("/_next/")) {
      return false;
    }

    logRequest(req.method ?? "?", url, "ghost");
    proxy.web(req, res, { target });

    return true;
  };
}
