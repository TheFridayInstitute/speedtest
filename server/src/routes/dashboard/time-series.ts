import { Hono } from "hono";
import { getDb } from "../../db.js";
import { buildMatchStage, buildSessionFilter } from "../../utils/aggregation.js";
import type { AppEnv } from "../../types.js";

type MetricField = "download" | "upload" | "ping" | "jitter";

const timeSeries = new Hono<AppEnv>();

function round2(n: number | null | undefined): number {
    if (n == null) return 0;
    return Math.round(n * 100) / 100;
}

timeSeries.get("/", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const interval = c.req.query("interval") ?? "daily";
    const h3Cells = c.req.query("h3Cells");
    const provider = c.req.query("provider");
    const entityId = c.req.query("entityId");
    const metric = c.req.query("metric") as MetricField | undefined;

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    const dateTruncUnit: Record<string, string> = {
        hourly: "hour",
        daily: "day",
        weekly: "week",
        monthly: "month",
    };
    const unit = dateTruncUnit[interval] ?? "day";

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

    pipeline.push({ $group: groupFields }, { $sort: { _id: 1 } });

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

    return c.json({ buckets });
});

export default timeSeries;
