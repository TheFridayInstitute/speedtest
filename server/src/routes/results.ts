import { Hono } from "hono";
import { getDb } from "../db.js";
import type { AppEnv, TestResultDoc } from "../types.js";

const results = new Hono<AppEnv>();

/** Submit a speedtest result. Requires X-Session-Token. */
results.post("/", async (c) => {
    const sessionId = c.get("sessionId");
    if (!sessionId) {
        return c.json({ error: "Session token required" }, 401);
    }

    const body = await c.req.json();
    const db = await getDb();

    const result: TestResultDoc = {
        sessionId,
        testType: body.testType ?? "traditional",
        serverId: body.serverId ?? "",
        serverName: body.serverName ?? "",
        download: body.download ?? null,
        upload: body.upload ?? null,
        ping: body.ping ?? null,
        jitter: body.jitter ?? null,
        dnsDownloadSpeed: body.dnsDownloadSpeed ?? null,
        dnsUid: body.dnsUid ?? null,
        timestamp: new Date(),
        raw: body.raw,
    };

    const inserted = await db.collection("test_results").insertOne(result);

    return c.json(
        { id: inserted.insertedId, sessionId, testType: result.testType },
        201,
    );
});

/** Get results for a session. */
results.get("/:sessionId", async (c) => {
    const db = await getDb();
    const sessionResults = await db
        .collection("test_results")
        .find({ sessionId: c.req.param("sessionId") })
        .sort({ timestamp: -1 })
        .toArray();

    return c.json(sessionResults);
});

export default results;
