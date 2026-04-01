import type { IncomingMessage, ServerResponse } from "http";

import { logRequest } from "../lib/logger.js";
import { proxy } from "../lib/proxy.js";

function isGhostPath(url: string): boolean {
  if (url.startsWith("/members/") && url.includes("token=")) return true;
  if (url.startsWith("/content/images")) return true;
  if (url.startsWith("/members/api")) return true;
  if (url.startsWith("/ghost")) return true;

  return false;
}

export function ghostRoute(target: string, atlasPanelUrl?: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? "/";

    if (!isGhostPath(url)) {
      return false;
    }

    // Next.js relative chunk URLs can resolve under /ghost/…/_next/…
    // These must fall through to the Next.js route, not Ghost.
    if (url.includes("/_next/")) {
      return false;
    }

    // Redirect top-level navigations to /ghost → Atlas admin panel.
    // Iframe requests (Sec-Fetch-Dest: iframe) pass through to Ghost directly.
    if (
      req.headers["sec-fetch-dest"] === "document" &&
      url.startsWith("/ghost") &&
      atlasPanelUrl
    ) {
      const destination = url.slice("/ghost".length) || "/";
      const redirectUrl = `${atlasPanelUrl}/admin/plugins/ghost?destination=${encodeURIComponent(destination)}`;

      logRequest(req.method ?? "?", url, "atlas-redirect");
      res.writeHead(302, { Location: redirectUrl });
      res.end();

      return true;
    }

    logRequest(req.method ?? "?", url, "ghost");
    proxy.web(req, res, { target });

    return true;
  };
}
