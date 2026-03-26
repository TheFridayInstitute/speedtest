import { z } from "zod";

/** POST /api/admin/subnets — create subnet */
export const subnetBodySchema = z.object({
    prefix: z.union([z.ipv4(), z.ipv6()]),
    prefixLength: z.coerce.number().int().min(0).max(128),
    entityName: z.string().max(500).default(""),
    entityId: z.string().max(200).default(""),
    entityType: z.string().max(200).default(""),
    networkType: z.string().max(200).default(""),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

/** PUT /api/admin/subnets/:id — update subnet */
export const subnetUpdateSchema = z.object({
    entityName: z.string().max(500).optional(),
    entityId: z.string().max(200).optional(),
    entityType: z.string().max(200).optional(),
    networkType: z.string().max(200).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
});

/** GET /api/admin/subnets query params */
export const subnetListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().max(200).optional(),
});
