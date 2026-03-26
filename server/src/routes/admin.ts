import { Hono } from "hono";
import { stream } from "hono/streaming";
import { getDb } from "../db.ts";
import { adminAuth } from "../middleware.ts";
import { getTrie } from "../trie/manager.ts";
import { buildMatchStage } from "../utils/aggregation.ts";
import type { AppEnv } from "../types.ts";
import {
    adminResultsQuerySchema,
    adminSessionsQuerySchema,
    adminStatsQuerySchema,
    parseQuery,
    isResponse,
} from "../validation/index.ts";

const admin = new Hono<AppEnv>();

// All admin routes require admin auth
admin.use("*", adminAuth);

/** Paginated results with filters. */
admin.get("/results", async (c) => {
    const query = parseQuery(c, adminResultsQuerySchema);
    if (isResponse(query)) return query;
    const { page, limit, dateFrom, dateTo, testType, psuId, entityId, after } = query;
    const skip = after ? 0 : (page - 1) * limit;
    const db = await getDb();

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    // Cursor-based pagination: fetch results older than the cursor timestamp
    if (after) {
        matchStage.timestamp = {
            ...matchStage.timestamp,
            $lt: new Date(after),
        };
    }
    const needsEntityFilter = !!(psuId || entityId);

    // Build pipeline: join + filter before pagination when entity filters are active
    const basePipeline: any[] = [
        { $match: matchStage },
        {
            $lookup: {
                from: "test_sessions",
                localField: "sessionId",
                foreignField: "_id",
                as: "session",
            },
        },
        { $unwind: { path: "$session", preserveNullAndEmptyArrays: !needsEntityFilter } },
        {
            $lookup: {
                from: "surveys",
                localField: "sessionId",
                foreignField: "sessionId",
                as: "survey",
            },
        },
        { $unwind: { path: "$survey", preserveNullAndEmptyArrays: true } },
    ];

    if (needsEntityFilter) {
        const entityFilter: Record<string, any> = {};
        if (psuId) entityFilter["session.entityLookup.psuId"] = psuId;
        if (entityId) entityFilter["session.entityLookup.entityId"] = entityId;
        basePipeline.push({ $match: entityFilter });
    }

    basePipeline.push({ $sort: { timestamp: -1 } });

    // Use $facet to get paginated data and total count in one query
    const pipeline = [
        ...basePipeline,
        {
            $facet: {
                data: [{ $skip: skip }, { $limit: limit }],
                count: [{ $count: "total" }],
            },
        },
    ];

    const [result] = await db
        .collection("test_results")
        .aggregate(pipeline)
        .toArray();

    const data = result?.data ?? [];
    const total = result?.count?.[0]?.total ?? 0;

    return c.json({ data, total, page, limit });
});

/** Export results as streamed CSV. */
admin.get("/results/export", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const testType = c.req.query("testType");
    const psuId = c.req.query("psuId");
    const entityId = c.req.query("entityId");

    const matchStage = buildMatchStage({ dateFrom, dateTo, testType });

    const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { timestamp: -1 } },
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
        { $unwind: { path: "$survey", preserveNullAndEmptyArrays: true } },
    ];

    if (psuId || entityId) {
        const entityFilter: Record<string, any> = {};
        if (psuId) entityFilter["session.entityLookup.psuId"] = psuId;
        if (entityId) entityFilter["session.entityLookup.entityId"] = entityId;
        pipeline.push({ $match: entityFilter });
    }

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

    function csvRow(r: any): string {
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
        return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    }

    c.header("Content-Type", "text/csv");
    c.header(
        "Content-Disposition",
        `attachment; filename=speedtest-results-${new Date().toISOString().slice(0, 10)}.csv`,
    );

    const cursor = db.collection("test_results").aggregate(pipeline);

    return stream(c, async (s) => {
        await s.write(headers.join(",") + "\n");
        for await (const r of cursor) {
            await s.write(csvRow(r) + "\n");
        }
    });
});

/** Aggregate statistics (supports optional filters). */
admin.get("/stats", async (c) => {
    const query = parseQuery(c, adminStatsQuerySchema);
    if (isResponse(query)) return query;
    const { dateFrom, dateTo, testType, entityId, psuId } = query;
    const db = await getDb();

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
    const query = parseQuery(c, adminSessionsQuerySchema);
    if (isResponse(query)) return query;
    const { page, limit, dateFrom, dateTo, entityId, ip, after } = query;
    const skip = after ? 0 : (page - 1) * limit;
    const db = await getDb();

    // Build match stage for sessions
    const matchStage: Record<string, any> = {};
    if (dateFrom || dateTo || after) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
        if (after) matchStage.createdAt.$lt = new Date(after);
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

/** Survey completion funnel: sessions → completed → skipped → none. */
admin.get("/funnel", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");

    const matchStage: Record<string, any> = {};
    if (dateFrom || dateTo) {
        matchStage.createdAt = {};
        if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
        if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    const [totalSessions, surveyStats] = await Promise.all([
        db.collection("test_sessions").countDocuments(matchStage),
        db
            .collection("surveys")
            .aggregate([
                ...(Object.keys(matchStage).length
                    ? [{ $match: { createdAt: matchStage.createdAt } }]
                    : []),
                {
                    $group: {
                        _id: "$skipped",
                        count: { $sum: 1 },
                    },
                },
            ])
            .toArray(),
    ]);

    const completed = surveyStats.find((s) => s._id === false)?.count ?? 0;
    const skipped = surveyStats.find((s) => s._id === true)?.count ?? 0;
    const noSurvey = totalSessions - completed - skipped;

    return c.json({ totalSessions, completed, skipped, noSurvey });
});

/** Top ISPs/providers by test count with average speeds. */
admin.get("/providers", async (c) => {
    const db = await getDb();

    const dateFrom = c.req.query("dateFrom");
    const dateTo = c.req.query("dateTo");
    const limitParam = Math.min(parseInt(c.req.query("limit") ?? "20", 10), 100);

    const matchStage = buildMatchStage({ dateFrom, dateTo });

    const results = await db
        .collection("test_results")
        .aggregate([
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
            {
                $group: {
                    _id: "$session.ipInfo.org",
                    count: { $sum: 1 },
                    avgDownload: { $avg: "$download" },
                    avgUpload: { $avg: "$upload" },
                    avgPing: { $avg: "$ping" },
                },
            },
            { $match: { _id: { $ne: null } } },
            { $sort: { count: -1 } },
            { $limit: limitParam },
        ])
        .toArray();

    const providers = results.map((r) => ({
        provider: r._id,
        count: r.count,
        avgDownload: Math.round((r.avgDownload ?? 0) * 100) / 100,
        avgUpload: Math.round((r.avgUpload ?? 0) * 100) / 100,
        avgPing: Math.round((r.avgPing ?? 0) * 100) / 100,
    }));

    return c.json({ providers });
});

export default admin;
