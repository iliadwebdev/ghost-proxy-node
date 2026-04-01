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
    //
    // Why a client-side redirect instead of a 302?
    // Ghost admin uses hash-based routing (e.g. /ghost/#/members/abc123).
    // Browsers never send the URL fragment (everything after #) to the server,
    // so a server-side redirect would always lose the specific admin page the
    // user was trying to reach. By serving a small HTML page with JavaScript,
    // we can read window.location.hash on the client and include it in the
    // redirect to Atlas.
    if (
      req.headers["sec-fetch-dest"] === "document" &&
      url.startsWith("/ghost") &&
      atlasPanelUrl
    ) {
      const atlasBase = `${atlasPanelUrl}/admin/plugins/ghost`;

      logRequest(req.method ?? "?", url, "atlas-redirect");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`<!DOCTYPE html>
<html><head><script>
var dest = location.hash ? "/" + location.hash : "/";
window.location.replace(${JSON.stringify(atlasBase)} + "?destination=" + encodeURIComponent(dest));
</script></head><body></body></html>`);

      return true;
    }

    logRequest(req.method ?? "?", url, "ghost");
    proxy.web(req, res, { target });

    return true;
  };
}
