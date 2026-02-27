import http from "http";

import type { IncomingMessage, ServerResponse } from "http";

export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
) => boolean;

export function createServer(routes: RouteHandler[]): http.Server {
  return http.createServer((req, res) => {
    for (const route of routes) {
      if (route(req, res)) return;
    }
  });
}
