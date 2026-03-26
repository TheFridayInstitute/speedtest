import { Hono } from "hono";
import { getDb } from "../db.js";
import { adminAuth } from "../middleware.js";
import { getTrie } from "../trie/manager.js";
import { buildMatchStage } from "../utils/aggregation.js";
import type { AppEnv } from "../types.js";

const admin = new Hono<AppEnv>();

// All admin routes require admin auth
admin.use("*", adminAuth);

/** Paginated results with filters. */
admin.get("/results", async (c) => {
    const db = await getDb();
    const page = parseInt(c.req.query("page") ?? "1", 10);
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
    const skip = (page - 1) * limit;

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const psuId = c.req.query("psuId");
    const entityId = c.req.query("entityId");

    // Build aggregation pipeline
    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { timestamp: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
            $lookup: {
                from: "test_sessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: { path: "$session", preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: "surveys",
                localField: "sessionId",
                foreignField: "sessionId",
                as: "survey",
            },
        },
        {
            $unwind: { path: "$survey", preserveNullAndEmptyArrays: true },
        },
    ];

    // Post-lookup filter for session-level fields
    if (psuId || entityId) {
        const postFilter: Record<string, any> = {};
        if (psuId) postFilter["session.entityLookup.psuId"] = psuId;
        if (entityId)
            postFilter["session.entityLookup.entityId"] = entityId;
        pipeline.push({ $match: postFilter });
    }

    const [data, totalArr] = await Promise.all([
        db.collection("test_results").aggregate(pipeline).toArray(),
        db.collection("test_results").countDocuments(matchStage),
    ]);

    return c.json({ data, total: totalArr, page, limit });
});

/** Export results as CSV. */
admin.get("/results/export", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");

    const filter = buildMatchStage({ dateFrom, dateTo });

    const results = await db
        .collection("test_results")
        .aggregate([
            { $match: filter },
            { $sort: { timestamp: -1 } },
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
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: "surveys",
                    localField: "sessionId",
                    foreignField: "sessionId",
                    as: "survey",
                },
            },
            {
                $unwind: {
                    path: "$survey",
                    preserveNullAndEmptyArrays: true,
                },
            },
        ])
        .toArray();

    // Build CSV
    const headers = [
        "timestamp",
        "testType",
        "serverName",
        "download",
        "upload",
        "ping",
        "jitter",
        "clientIp",
        "provider",
        "entityName",
        "flow",
        "name",
        "schoolName",
        "schoolNumber",
    ];
    const csvLines = [headers.join(",")];

    for (const r of results) {
        const row = [
            r.timestamp?.toISOString() ?? "",
            r.testType ?? "",
            r.serverName ?? "",
            r.download ?? "",
            r.upload ?? "",
            r.ping ?? "",
            r.jitter ?? "",
            r.session?.clientIp ?? "",
            r.session?.ipInfo?.org ?? "",
            r.session?.entityLookup?.entityName ?? "",
            r.survey?.flow ?? "",
            r.survey?.name ?? "",
            r.survey?.schoolName ?? "",
            r.survey?.schoolNumber ?? "",
        ];
        csvLines.push(row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }

    c.header("Content-Type", "text/csv");
    c.header(
        "Content-Disposition",
        `attachment; filename=speedtest-results-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    return c.text(csvLines.join("\n"));
});

/** Aggregate statistics (supports optional filters). */
admin.get("/stats", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const entityId = c.req.query("entityId");
    const psuId = c.req.query("psuId");

    const hasFilters = !!(dateFrom || dateTo || testType || entityId || psuId);

    if (!hasFilters) {
        // Original unfiltered behavior
        const [totalResults, totalSessions, totalSurveys, trieSize] =
            await Promise.all([
                db.collection("test_results").countDocuments(),
                db.collection("test_sessions").countDocuments(),
                db.collection("surveys").countDocuments({ skipped: false }),
                Promise.resolve(getTrie().size),
            ]);

        const avgPipeline = await db
            .collection("test_results")
            .aggregate([
                { $match: { testType: "traditional" } },
                {
                    $group: {
                        _id: null,
                        avgDownload: { $avg: "$download" },
                        avgUpload: { $avg: "$upload" },
                        avgPing: { $avg: "$ping" },
                    },
                },
            ])
            .toArray();

        const avg = avgPipeline[0] ?? {
            avgDownload: 0,
            avgUpload: 0,
            avgPing: 0,
        };

        return c.json({
            totalResults,
            totalSessions,
            totalSurveys,
            trieEntries: trieSize,
            averages: {
                download: Math.round((avg.avgDownload ?? 0) * 100) / 100,
                upload: Math.round((avg.avgUpload ?? 0) * 100) / 100,
                ping: Math.round((avg.avgPing ?? 0) * 100) / 100,
            },
        });
    }

    // Filtered stats
    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    const pipeline: any[] = [{ $match: matchStage }];

    // Join sessions for entity/psu filters
    if (entityId || psuId) {
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

        const postFilter: Record<string, any> = {};
        if (entityId)
            postFilter["session.entityLookup.entityId"] = entityId;
        if (psuId) postFilter["session.entityLookup.psuId"] = psuId;
        pipeline.push({ $match: postFilter });
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
        averages: {
            download: Math.round((stats.avgDownload ?? 0) * 100) / 100,
            upload: Math.round((stats.avgUpload ?? 0) * 100) / 100,
            ping: Math.round((stats.avgPing ?? 0) * 100) / 100,
            jitter: Math.round((stats.avgJitter ?? 0) * 100) / 100,
        },
    });
});

/** Paginated sessions list with filters. */
admin.get("/sessions", async (c) => {
    const db = await getDb();
    const page = parseInt(c.req.query("page") ?? "1", 10);
    const limit = Math.min(parseInt(c.req.query("limit") ?? "50", 10), 200);
    const skip = (page - 1) * limit;

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const entityId = c.req.query("entityId");
    const ip = c.req.query("ip");

    // Build match stage for sessions
    const matchStage: Record<string, any> = {};
    if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }
    if (entityId) matchStage["entityLookup.entityId"] = entityId;
    if (ip) matchStage.clientIp = ip;

    const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        // Join result counts
        {
            $lookup: {
                from: "test_results",
                localField: "_id",
                foreignField: "sessionId",
                as: "results",
            },
        },
        // Join survey status
        {
            $lookup: {
                from: "surveys",
                localField: "_id",
                foreignField: "sessionId",
                as: "survey",
            },
        },
        {
            $unwind: { path: "$survey", preserveNullAndEmptyArrays: true },
        },
        {
            $project: {
                _id: 1,
                clientIp: 1,
                ipInfo: 1,
                h3Indices: 1,
                entityLookup: 1,
                userAgent: 1,
                createdAt: 1,
                lastSeenAt: 1,
                resultCount: { $size: "$results" },
                hasSurvey: {
                    $cond: [{ $ifNull: ["$survey", false] }, true, false],
                },
                surveyFlow: "$survey.flow",
                surveySkipped: "$survey.skipped",
            },
        },
    ];

    const [data, total] = await Promise.all([
        db.collection("test_sessions").aggregate(pipeline).toArray(),
        db.collection("test_sessions").countDocuments(matchStage),
    ]);

    return c.json({ data, total, page, limit });
});

export default admin;
