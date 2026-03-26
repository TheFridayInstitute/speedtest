import { Hono } from "hono";
import { latLngToCell } from "h3-js";
import { getDb } from "../../db.js";
import { buildMatchStage, buildSessionFilter } from "../../utils/aggregation.js";
import type { AppEnv } from "../../types.js";

type MetricField = "download" | "upload" | "ping" | "jitter";

const hexMap = new Hono<AppEnv>();

hexMap.get("/", async (c) => {
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
        // Join to surveys for address geolocation
        {
            $lookup: {
                from: "surveys",
                localField: "sessionId",
                foreignField: "sessionId",
                as: "survey",
            },
        },
        { $unwind: { path: "$survey", preserveNullAndEmptyArrays: false } },
        // Only include results where the survey has address lat/lng
        {
            $match: {
                "survey.address.lat": { $exists: true, $ne: null },
                "survey.address.lng": { $exists: true, $ne: null },
            },
        },
        // Also join sessions for entity/provider filtering
        {
            $lookup: {
                from: "test_sessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },
    ];

    // Apply session-level filters
    const sessionFilter = buildSessionFilter({ provider, entityId });
    if (sessionFilter) {
        pipeline.push({ $match: sessionFilter });
    }

    // Project only needed fields
    pipeline.push({
        $project: {
            lat: "$survey.address.lat",
            lng: "$survey.address.lng",
            metricValue: `$${metric}`,
        },
    });

    const results = await db
        .collection("test_results")
        .aggregate(pipeline)
        .toArray();

    // Compute H3 indices in memory and aggregate
    const hexAgg = new Map<
        string,
        { count: number; sum: number; min: number; max: number }
    >();

    for (const r of results) {
        const lat = r.lat as number;
        const lng = r.lng as number;
        const val = r.metricValue as number;
        if (lat == null || lng == null || val == null) continue;

        let h3Index: string;
        try {
            h3Index = latLngToCell(lat, lng, resolution);
        } catch {
            continue;
        }

        const entry = hexAgg.get(h3Index);
        if (entry) {
            entry.count++;
            entry.sum += val;
            entry.min = Math.min(entry.min, val);
            entry.max = Math.max(entry.max, val);
        } else {
            hexAgg.set(h3Index, { count: 1, sum: val, min: val, max: val });
        }
    }

    const data = Array.from(hexAgg.entries()).map(([h3Index, stats]) => ({
        h3Index,
        count: stats.count,
        avg: Math.round((stats.sum / stats.count) * 100) / 100,
        min: Math.round(stats.min * 100) / 100,
        max: Math.round(stats.max * 100) / 100,
    }));

    return c.json(data);
});

export default hexMap;
