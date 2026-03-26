import { z } from "zod";
import { optionalDate, testTypeEnum, metricEnum, intervalEnum } from "./primitives.ts";

/** Dashboard query params (shared across time-series, distributions, summary) */
export const dashboardQuerySchema = z.object({
    dateFrom: optionalDate,
    dateTo: optionalDate,
    testType: testTypeEnum.optional(),
    h3Cells: z.string().max(5000).optional(),
    provider: z.string().max(500).optional(),
    entityId: z.string().max(200).optional(),
});

/** GET /api/dashboard/time-series query params */
export const timeSeriesQuerySchema = dashboardQuerySchema.extend({
    interval: intervalEnum.default("daily"),
    metric: metricEnum.optional(),
});

/** GET /api/dashboard/distributions query params */
export const distributionsQuerySchema = dashboardQuerySchema.extend({
    metric: metricEnum,
});

/** GET /api/dashboard/hex-map query params */
export const hexMapQuerySchema = dashboardQuerySchema.extend({
    resolution: z.coerce.number().int().min(4).max(7).default(5),
    metric: metricEnum.default("download"),
});
