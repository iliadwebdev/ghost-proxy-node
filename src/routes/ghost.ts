import type { IncomingMessage, ServerResponse } from "http";
import { proxy } from "../lib/proxy.js";
import { logRequest } from "../lib/logger.js";

export function ghostRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    const url = req.url ?? "/";
    if (!url.startsWith("/ghost") && !url.startsWith("/content/images")) {
      return false;
    }

    logRequest(req.method ?? "?", url, "ghost");
    proxy.web(req, res, { target });
    return true;
  };
}
