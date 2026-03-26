import { Hono } from "hono";
import { getDb } from "../../db.js";
import { buildMatchStage, buildSessionFilter } from "../../utils/aggregation.js";
import type { AppEnv } from "../../types.js";

const summary = new Hono<AppEnv>();

function round2(n: number | null | undefined): number {
    if (n == null) return 0;
    return Math.round(n * 100) / 100;
}

summary.get("/", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const provider = c.req.query("provider");
    const entityId = c.req.query("entityId");
    const h3Cells = c.req.query("h3Cells");

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
