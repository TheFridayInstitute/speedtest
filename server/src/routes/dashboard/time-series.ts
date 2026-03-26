import { Hono } from "hono";
import { getDb } from "../../db.ts";
import { buildMatchStage, buildSessionFilter } from "../../utils/aggregation.ts";
import type { AppEnv } from "../../types.ts";
import { timeSeriesQuerySchema, parseQuery, isResponse } from "../../validation/index.ts";

const timeSeries = new Hono<AppEnv>();

function round2(n: number | null | undefined): number {
    if (n == null) return 0;
    return Math.round(n * 100) / 100;
}

timeSeries.get("/", async (c) => {
    const query = parseQuery(c, timeSeriesQuerySchema);
    if (isResponse(query)) return query;
    const { dateFrom, dateTo, testType, interval, h3Cells, provider, entityId, metric } = query;
    const db = await getDb();

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    const dateTruncUnit: Record<string, string> = {
        hourly: "hour",
        daily: "day",
        weekly: "week",
        monthly: "month",
    };

    // Auto-upgrade interval when the date range would produce too many buckets
    let effectiveInterval = interval;
    if (dateFrom && dateTo) {
        const rangeMs = new Date(dateTo).getTime() - new Date(dateFrom).getTime();
        const rangeDays = rangeMs / 86_400_000;
        if (effectiveInterval === "hourly" && rangeDays > 21) effectiveInterval = "daily";
        if (effectiveInterval === "daily" && rangeDays > 500) effectiveInterval = "weekly";
        if (effectiveInterval === "weekly" && rangeDays > 1095) effectiveInterval = "monthly";
    }

    const unit = dateTruncUnit[effectiveInterval] ?? "day";

    const pipeline: any[] = [{ $match: matchStage }];

    // If h3Cells or provider or entityId, we need to join sessions
    const needSessionJoin = !!(h3Cells || provider || entityId);
    if (needSessionJoin) {
        pipeline.push(
            {
                $lookup: {
                    from: "test_sessions",
                    localField: "sessionId",
                    foreignField: "_id",
                    as: "session",
                },
            },
            {
                $unwind: {
                    path: "$session",
                    preserveNullAndEmptyArrays: false,
                },
            },
        );

        if (h3Cells) {
            const cells = h3Cells.split(",").map((s) => s.trim());
            // Filter sessions that have any of the requested H3 cells
            pipeline.push({
                $match: {
                    $or: [
                        { "session.h3Indices.res4": { $in: cells } },
                        { "session.h3Indices.res5": { $in: cells } },
                        { "session.h3Indices.res6": { $in: cells } },
                        { "session.h3Indices.res7": { $in: cells } },
                    ],
                },
            });
        }

        const sessionFilter = buildSessionFilter({ provider, entityId });
        if (sessionFilter) {
            pipeline.push({ $match: sessionFilter });
        }
    }

    // Group by time bucket
    const groupFields: Record<string, any> = {
        _id: {
            $dateTrunc: {
                date: "$timestamp",
                unit,
            },
        },
        count: { $sum: 1 },
    };

    // Always compute all four metrics
    for (const m of ["download", "upload", "ping", "jitter"] as const) {
        groupFields[`${m}Avg`] = {
            $avg: { $cond: [{ $ne: [`$${m}`, null] }, `$${m}`, "$$REMOVE"] },
        };
        groupFields[`${m}Count`] = {
            $sum: { $cond: [{ $ne: [`$${m}`, null] }, 1, 0] },
        };
    }

    pipeline.push(
        { $group: groupFields },
        { $sort: { _id: 1 } },
        { $limit: 1000 },
    );

    const results = await db
        .collection("test_results")
        .aggregate(pipeline)
        .toArray();

    const buckets = results.map((r) => ({
        timestamp: r._id,
        download: { avg: round2(r.downloadAvg), count: r.downloadCount },
        upload: { avg: round2(r.uploadAvg), count: r.uploadCount },
        ping: { avg: round2(r.pingAvg), count: r.pingCount },
        jitter: { avg: round2(r.jitterAvg), count: r.jitterCount },
    }));

    return c.json({ buckets, interval: effectiveInterval });
});

export default timeSeries;
