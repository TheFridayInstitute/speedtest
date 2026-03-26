import { z } from "zod";
import type { Context } from "hono";

/**
 * Parse and validate a JSON body against a Zod schema.
 * Returns the parsed data or a 400 Response with validation errors.
 */
export async function parseBody<T extends z.ZodTypeAny>(
    c: Context,
    schema: T,
): Promise<z.infer<T> | Response> {
    const body = await c.req.json().catch(() => null);
    if (body === null) {
        return c.json({ error: "Invalid JSON body" }, 400);
    }
    const result = schema.safeParse(body);
    if (!result.success) {
        return c.json(
            {
                error: "Validation failed",
                details: result.error.issues.map((i) => ({
                    path: i.path.join("."),
                    message: i.message,
                })),
            },
            400,
        );
    }
    return result.data;
}

/**
 * Parse and validate query parameters against a Zod schema.
 * Returns the parsed data or a 400 Response with validation errors.
 */
export function parseQuery<T extends z.ZodTypeAny>(
    c: Context,
    schema: T,
): z.infer<T> | Response {
    const raw = c.req.query();
    const result = schema.safeParse(raw);
    if (!result.success) {
        return c.json(
            {
                error: "Invalid query parameters",
                details: result.error.issues.map((i) => ({
                    path: i.path.join("."),
                    message: i.message,
                })),
            },
            400,
        );
    }
    return result.data;
}

/** Type guard: checks if a parse result is a Response (validation error). */
export function isResponse(val: unknown): val is Response {
    return val instanceof Response;
}
