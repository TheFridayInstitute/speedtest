import { z } from "zod";

/** POST /api/admin/servers — register server */
export const registerServerSchema = z.object({
    serverId: z.string().min(1).max(200),
    name: z.string().max(500).optional(),
    region: z.string().max(100).optional(),
    host: z.string().min(1).max(500),
    port: z.coerce.number().int().min(1).max(65535).optional(),
});

/** POST /api/admin/servers/deploy — deploy EC2 server */
export const deployServerSchema = z.object({
    name: z.string().min(1).max(500),
    region: z.string().max(100).optional(),
    instanceType: z.string().max(100).optional(),
});
