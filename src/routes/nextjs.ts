import type { IncomingMessage, ServerResponse } from "http";
import { proxy } from "../lib/proxy.js";
import { logRequest } from "../lib/logger.js";

export function nextjsRoute(target: string) {
  return (req: IncomingMessage, res: ServerResponse): boolean => {
    logRequest(req.method ?? "?", req.url ?? "/", "nextjs");
    proxy.web(req, res, { target });
    return true;
  };
}
