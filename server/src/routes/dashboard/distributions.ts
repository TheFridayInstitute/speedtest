import { Hono } from "hono";
import { getDb } from "../../db.js";
import { buildMatchStage, buildSessionFilter } from "../../utils/aggregation.js";
import type { AppEnv } from "../../types.js";

type MetricField = "download" | "upload" | "ping" | "jitter";

const distributions = new Hono<AppEnv>();

function round2(n: number | null | undefined): number {
    if (n == null) return 0;
    return Math.round(n * 100) / 100;
}

distributions.get("/", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const h3Cells = c.req.query("h3Cells");
    const provider = c.req.query("provider");
    const entityId = c.req.query("entityId");
    const metric = c.req.query("metric") as MetricField | undefined;

    if (!metric) {
        return c.json({ error: "metric query parameter is required" }, 400);
    }

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });
    matchStage[metric] = { $ne: null };

    const pipeline: any[] = [{ $match: matchStage }];

    // Session join for spatial/entity filters
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

    // Use percentile-based boundaries (P1 to P99) to exclude outliers from bin range
    const rangeResult = await db
        .collection("test_results")
        .aggregate([
            ...pipeline,
            {
                $group: {
                    _id: null,
                    range: {
                        $percentile: {
                            input: `$${metric}`,
                            p: [0.01, 0.99],
                            method: "approximate",
                        },
                    },
                    count: { $sum: 1 },
                },
            },
        ])
        .toArray();

    if (!rangeResult.length || rangeResult[0].count === 0) {
        return c.json({
            histogram: [],
            boxPlot: {
                p10: 0,
                p25: 0,
                median: 0,
                p75: 0,
                p90: 0,
                mean: 0,
            },
        });
    }

    const p1 = rangeResult[0].range[0] ?? 0;
    const p99 = rangeResult[0].range[1] ?? 1;
    const dataMin = Math.max(0, Math.floor(p1));
    const dataMax = Math.ceil(p99);
    const numBins = 20;
    const binWidth = (dataMax - dataMin) / numBins || 1;

    // Build bucket boundaries from P1 to P99
    const boundaries: number[] = [];
    for (let i = 0; i <= numBins; i++) {
        boundaries.push(
            Math.round((dataMin + i * binWidth) * 100) / 100,
        );
    }
    // Ensure the last boundary is strictly greater than max
    if (boundaries[boundaries.length - 1] <= dataMax) {
        boundaries[boundaries.length - 1] = dataMax + 0.01;
    }

    // Histogram via $bucket
    const histogramPipeline = [
        ...pipeline,
        {
            $bucket: {
                groupBy: `$${metric}`,
                boundaries,
                default: "overflow",
                output: { count: { $sum: 1 } },
            },
        },
    ];

    // Percentiles via $group with $percentile (MongoDB 7+)
    const percentilePipeline = [
        ...pipeline,
        {
            $group: {
                _id: null,
                percentiles: {
                    $percentile: {
                        input: `$${metric}`,
                        p: [0.1, 0.25, 0.5, 0.75, 0.9],
                        method: "approximate",
                    },
                },
                mean: { $avg: `$${metric}` },
            },
        },
    ];

    const [histogramResult, percentileResult] = await Promise.all([
        db
            .collection("test_results")
            .aggregate(histogramPipeline)
            .toArray(),
        db
            .collection("test_results")
            .aggregate(percentilePipeline)
            .toArray(),
    ]);

    // Format histogram
    const histogram = histogramResult
        .filter((b) => b._id !== "overflow")
        .map((b, i) => ({
            min: boundaries[i] ?? b._id,
            max: boundaries[i + 1] ?? b._id,
            count: b.count,
        }));

    // Format box plot
    const pResult = percentileResult[0];
    const pValues = pResult?.percentiles ?? [0, 0, 0, 0, 0];
    const boxPlot = {
        p10: round2(pValues[0]),
        p25: round2(pValues[1]),
        median: round2(pValues[2]),
        p75: round2(pValues[3]),
        p90: round2(pValues[4]),
        mean: round2(pResult?.mean ?? 0),
    };

    return c.json({ histogram, boxPlot });
});

export default distributions;
