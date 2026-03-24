import { Hono } from "hono";
import { getDb } from "../db.js";
import { resolveIP, hashIP } from "../middleware.js";
import type { AppEnv, TestSessionDoc } from "../types.js";

const sessions = new Hono<AppEnv>();

/** Create a new test session. */
sessions.post("/", async (c) => {
    const db = await getDb();
    const ip = resolveIP(c);
    const ipHash = await hashIP(ip);
    const sessionId = crypto.randomUUID();
    const now = new Date();

    const session: TestSessionDoc = {
        _id: sessionId,
        clientIp: ip,
        ipHash,
        ipInfo: null,
        entityLookup: null,
        userAgent: c.req.header("User-Agent") ?? "",
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24h
    };

    await db.collection("test_sessions").insertOne(session as any);

    return c.json({ sessionId }, 201);
});

/** Get session info. */
sessions.get("/:id", async (c) => {
    const db = await getDb();
    const session = await db
        .collection("test_sessions")
        .findOne({ _id: c.req.param("id") as any });

    if (!session) {
        return c.json({ error: "Session not found" }, 404);
    }

    return c.json({
        sessionId: session._id,
        ipInfo: session.ipInfo,
        entityLookup: session.entityLookup,
        createdAt: session.createdAt,
    });
});

export default sessions;
