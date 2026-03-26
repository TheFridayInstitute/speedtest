import { Hono } from "hono";
import { getDb } from "../../db.ts";
import { buildMatchStage, buildSessionFilter } from "../../utils/aggregation.ts";
import type { AppEnv } from "../../types.ts";
import { dashboardQuerySchema, parseQuery, isResponse } from "../../validation/index.ts";

const summary = new Hono<AppEnv>();

function round2(n: number | null | undefined): number {
    if (n == null) return 0;
    return Math.round(n * 100) / 100;
}

summary.get("/", async (c) => {
    const query = parseQuery(c, dashboardQuerySchema);
    if (isResponse(query)) return query;
    const { dateFrom, dateTo, testType, provider, entityId, h3Cells } = query;
    const db = await getDb();

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    const pipeline: any[] = [{ $match: matchStage }];

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

    pipeline.push({
        $group: {
            _id: null,
            totalResults: { $sum: 1 },
            avgDownload: { $avg: "$download" },
            avgUpload: { $avg: "$upload" },
            avgPing: { $avg: "$ping" },
            avgJitter: { $avg: "$jitter" },
        },
    });

    const results = await db
        .collection("test_results")
        .aggregate(pipeline)
        .toArray();

    const stats = results[0] ?? {
        totalResults: 0,
        avgDownload: 0,
        avgUpload: 0,
        avgPing: 0,
        avgJitter: 0,
    };

    return c.json({
        totalResults: stats.totalResults,
        avgDownload: round2(stats.avgDownload ?? 0),
        avgUpload: round2(stats.avgUpload ?? 0),
        avgPing: round2(stats.avgPing ?? 0),
        avgJitter: round2(stats.avgJitter ?? 0),
    });
});

export default summary;
