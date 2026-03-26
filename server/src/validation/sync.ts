import { z } from "zod";

const defaultColumnMapping = {
    prefix: "Prefix",
    prefixLength: "Length",
    entityName: "Entity Name",
    entityId: "Entity ID",
    entityType: "Entity Type",
    networkType: "Type",
} as const;

/** POST /api/admin/sync — create sync config */
export const syncConfigSchema = z.object({
    name: z.string().min(1).max(500),
    spreadsheetId: z.string().min(1).max(500),
    range: z.string().max(200).default("Sheet1"),
    columnMapping: z
        .object({
            prefix: z.string().max(200).default(defaultColumnMapping.prefix),
            prefixLength: z.string().max(200).default(defaultColumnMapping.prefixLength),
            entityName: z.string().max(200).default(defaultColumnMapping.entityName),
            entityId: z.string().max(200).optional().default(defaultColumnMapping.entityId),
            entityType: z.string().max(200).optional().default(defaultColumnMapping.entityType),
            networkType: z.string().max(200).optional().default(defaultColumnMapping.networkType),
        })
        .default(defaultColumnMapping),
});
