import { Hono } from "hono";
import { latLngToCell } from "h3-js";
import { getDb } from "../db.js";
import { rateLimit } from "../middleware.js";
import type { AppEnv } from "../types.js";

const dashboard = new Hono<AppEnv>();

// Rate limit all dashboard endpoints
dashboard.use("*", rateLimit);

// ── Helpers ──────────────────────────────────────────────────────────

type MetricField = "download" | "upload" | "ping" | "jitter";

function buildMatchStage(query: {
    dateFrom?: string;
    dateTo?: string;
    testType?: string;
}): Record<string, any> {
    const match: Record<string, any> = {};
    if (query.dateFrom || query.dateTo) {
        match.timestamp = {};
        if (query.dateFrom) match.timestamp.$gte = new Date(query.dateFrom);
        if (query.dateTo) match.timestamp.$lte = new Date(query.dateTo);
    }
    if (query.testType) match.testType = query.testType;
    return match;
}

function buildSessionFilter(query: {
    provider?: string;
    entityId?: string;
}): Record<string, any> | null {
    const filter: Record<string, any> = {};
    if (query.provider) filter["session.ipInfo.org"] = query.provider;
    if (query.entityId) filter["session.entityLookup.entityId"] = query.entityId;
    if (Object.keys(filter).length === 0) return null;
    return filter;
}

// ── GET /hex-map ─────────────────────────────────────────────────────

dashboard.get("/hex-map", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const provider = c.req.query("provider");
    const entityId = c.req.query("entityId");
    const resolution = Math.min(
        Math.max(parseInt(c.req.query("resolution") ?? "5", 10), 4),
        7,
    );
    const metric = (c.req.query("metric") ?? "download") as MetricField;

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    // Ensure we only aggregate results where the metric is non-null
    matchStage[metric] = { $ne: null };

    const pipeline: any[] = [
        { $match: matchStage },
        {
            $lookup: {
                from: "test_sessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: { path: "$session", preserveNullAndEmptyArrays: false } },
        // Only include results where the session has location data
        { $match: { "session.ipInfo.loc": { $exists: true, $ne: null } } },
    ];

    // Apply session-level filters
    const sessionFilter = buildSessionFilter({ provider, entityId });
    if (sessionFilter) {
        pipeline.push({ $match: sessionFilter });
    }

    // Project only needed fields
    pipeline.push({
        $project: {
            loc: "$session.ipInfo.loc",
            metricValue: `$${metric}`,
        },
    });

    const results = await db
        .collection("test_results")
        .aggregate(pipeline)
        .toArray();

    // Compute H3 indices in memory and aggregate
    const resKey = `res${resolution}` as const;
    const hexMap = new Map<
        string,
        { count: number; sum: number; min: number; max: number }
    >();

    for (const r of results) {
        const loc = r.loc as string;
        const val = r.metricValue as number;
        if (!loc || val == null) continue;

        const parts = loc.split(",");
        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);
        if (isNaN(lat) || isNaN(lng)) continue;

        let h3Index: string;
        try {
            h3Index = latLngToCell(lat, lng, resolution);
        } catch {
            continue;
        }

        const entry = hexMap.get(h3Index);
        if (entry) {
            entry.count++;
            entry.sum += val;
            entry.min = Math.min(entry.min, val);
            entry.max = Math.max(entry.max, val);
        } else {
            hexMap.set(h3Index, { count: 1, sum: val, min: val, max: val });
        }
    }

    const data = Array.from(hexMap.entries()).map(([h3Index, stats]) => ({
        h3Index,
        count: stats.count,
        avg: Math.round((stats.sum / stats.count) * 100) / 100,
        min: Math.round(stats.min * 100) / 100,
        max: Math.round(stats.max * 100) / 100,
    }));

    return c.json(data);
});

// ── GET /time-series ─────────────────────────────────────────────────

dashboard.get("/time-series", async (c) => {
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

// ── GET /distributions ───────────────────────────────────────────────

dashboard.get("/distributions", async (c) => {
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

// ── GET /summary ─────────────────────────────────────────────────────

dashboard.get("/summary", async (c) => {
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

// ── Utility ──────────────────────────────────────────────────────────

function round2(n: number | null | undefined): number {
    if (n == null) return 0;
    return Math.round(n * 100) / 100;
}

export default dashboard;
