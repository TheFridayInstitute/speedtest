import { Hono } from "hono";
import { latLngToCell } from "h3-js";
import { getDb } from "../db.ts";
import { resolveIP, hashIP } from "../middleware.ts";
import type { AppEnv, H3Indices, TestSessionDoc } from "../types.ts";

const sessions = new Hono<AppEnv>();

/** Create a new test session. */
sessions.post("/", async (c) => {
    const db = await getDb();
    const ip = resolveIP(c);
    const ipHash = await hashIP(ip);
    const sessionId = crypto.randomUUID();
    const now = new Date();

    // Fetch IP info and compute H3 indices
    let ipInfo = null;
    let h3Indices: H3Indices | null = null;

    const ipInfoToken = process.env.IPINFO_TOKEN;
    const isLocal =
        ip === "::1" ||
        ip === "127.0.0.1" ||
        ip.startsWith("192.168.") ||
        ip.startsWith("10.");

    if (ipInfoToken && !isLocal) {
        try {
            const resp = await fetch(`https://ipinfo.io/${ip}`, {
                headers: { Authorization: `Bearer ${ipInfoToken}` },
            });
            if (resp.ok) {
                ipInfo = await resp.json();

                // Cache ipInfo
                db.collection("ipinfo_cache")
                    .updateOne(
                        { ip },
                        {
                            $set: { data: ipInfo, fetchedAt: new Date() },
                            $setOnInsert: { ip },
                        },
                        { upsert: true },
                    )
                    .catch(() => {}); // non-blocking

                // Compute H3 indices from location
                if (ipInfo?.loc) {
                    const [lat, lng] = (ipInfo.loc as string)
                        .split(",")
                        .map(Number);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        try {
                            h3Indices = {
                                res4: latLngToCell(lat, lng, 4),
                                res5: latLngToCell(lat, lng, 5),
                                res6: latLngToCell(lat, lng, 6),
                                res7: latLngToCell(lat, lng, 7),
                            };
                        } catch {
                            // H3 computation is best-effort
                        }
                    }
                }
            }
        } catch {
            // IP info is best-effort
        }
    }

    const session: TestSessionDoc = {
        _id: sessionId,
        clientIp: ip,
        ipHash,
        ipInfo,
        h3Indices,
        entityLookup: null,
        userAgent: c.req.header("User-Agent") ?? "",
        createdAt: now,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000), // 2h
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
