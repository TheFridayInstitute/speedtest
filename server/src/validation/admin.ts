import { z } from "zod";
import { optionalDate, testTypeEnum } from "./primitives.ts";

/** Shared pagination query params */
const paginationQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    dateFrom: optionalDate,
    dateTo: optionalDate,
});

/** GET /api/admin/results query params */
export const adminResultsQuerySchema = paginationQuerySchema.extend({
    testType: testTypeEnum.optional(),
    psuId: z.string().max(200).optional(),
    entityId: z.string().max(200).optional(),
    after: z.string().max(30).optional(), // cursor: ISO timestamp of last item
});

/** GET /api/admin/sessions query params */
export const adminSessionsQuerySchema = paginationQuerySchema.extend({
    entityId: z.string().max(200).optional(),
    ip: z.string().max(45).optional(),
    after: z.string().max(30).optional(), // cursor: ISO timestamp of last item
});

/** GET /api/admin/stats query params */
export const adminStatsQuerySchema = z.object({
    dateFrom: optionalDate,
    dateTo: optionalDate,
    testType: testTypeEnum.optional(),
    entityId: z.string().max(200).optional(),
    psuId: z.string().max(200).optional(),
});
