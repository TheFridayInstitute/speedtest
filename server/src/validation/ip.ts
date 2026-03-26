import { z } from "zod";

/** IP address path parameter — accepts IPv4, IPv6, or general IP-like strings */
export const ipParamSchema = z.object({
    ip: z.union([z.ipv4(), z.ipv6(), z.string().regex(/^[\d.:a-fA-F]+$/).max(45)]),
});
