import type { MiddlewareHandler } from "hono";

/**
 * Assigns a unique request ID to each request.
 * Sets `X-Request-Id` response header and stores on context.
 */
export const requestId: MiddlewareHandler = async (c, next) => {
    const id = c.req.header("X-Request-Id") ?? crypto.randomUUID();
    c.set("requestId", id);
    await next();
    c.res.headers.set("X-Request-Id", id);
};
