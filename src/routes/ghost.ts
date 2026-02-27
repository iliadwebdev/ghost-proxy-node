import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

export function ghostRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? "/";
    if (!url.startsWith("/ghost") && !url.startsWith("/content/images")) {
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
