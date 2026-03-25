import { Hono } from "hono";
import { getDb } from "../db.js";
import { adminAuth } from "../middleware.js";
import type { AppEnv } from "../types.js";

const servers = new Hono<AppEnv>();

// ── Public: list active servers ───────────────────────────────────────

servers.get("/", async (c) => {
    const db = await getDb();
    const now = new Date();
    const healthyThreshold = new Date(now.getTime() - 90_000); // 90s

    const docs = await db
        .collection("speedtest_servers")
        .find({ active: true })
        .sort({ lastHeartbeat: -1 })
        .toArray();

    const result = docs.map((d) => ({
        serverId: d.serverId,
        name: d.name,
        region: d.region,
        host: d.host,
        port: d.port,
        endpoints: d.endpoints ?? {
            garbage: "/api/speedtest/garbage",
            empty: "/api/speedtest/empty",
            getIP: "/api/speedtest/getIP",
        },
        status: d.lastHeartbeat > healthyThreshold ? "healthy" : "offline",
    }));

    return c.json(result);
});

// ── Internal: heartbeat from speedtest servers ────────────────────────

servers.put("/:serverId/heartbeat", async (c) => {
    const serverId = c.req.param("serverId");
    const secret = c.req.header("X-Server-Secret");
    const expectedSecret = process.env.SERVER_SECRET;

    // In production, require matching secret
    if (process.env.NODE_ENV === "production" && expectedSecret && secret !== expectedSecret) {
        return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.json<{ currentLoad?: number; capacity?: number }>().catch(() => ({ currentLoad: undefined, capacity: undefined }));
    const db = await getDb();

    await db.collection("speedtest_servers").updateOne(
        { serverId },
        {
            $set: {
                currentLoad: body.currentLoad ?? 0,
                capacity: body.capacity ?? 50,
                lastHeartbeat: new Date(),
            },
        },
        { upsert: false },
    );

    return c.json({ ok: true });
});

// ── Admin: full server management ─────────────────────────────────────

const adminServers = new Hono<AppEnv>();
adminServers.use("*", adminAuth);

/** List all servers (including inactive). */
adminServers.get("/", async (c) => {
    const db = await getDb();
    const now = new Date();
    const healthyThreshold = new Date(now.getTime() - 90_000);
    const degradedThreshold = new Date(now.getTime() - 180_000);

    const docs = await db
        .collection("speedtest_servers")
        .find()
        .sort({ lastHeartbeat: -1 })
        .toArray();

    const result = docs.map((d) => {
        let status: "healthy" | "degraded" | "offline" = "offline";
        if (d.lastHeartbeat > healthyThreshold) status = "healthy";
        else if (d.lastHeartbeat > degradedThreshold) status = "degraded";

        return {
            serverId: d.serverId,
            name: d.name,
            region: d.region,
            host: d.host,
            port: d.port,
            active: d.active,
            currentLoad: d.currentLoad ?? 0,
            capacity: d.capacity ?? 50,
            lastHeartbeat: d.lastHeartbeat,
            createdAt: d.createdAt,
            status,
        };
    });

    return c.json(result);
});

/** Register a new server manually. */
adminServers.post("/", async (c) => {
    const body = await c.req.json<{
        serverId: string;
        name: string;
        region: string;
        host: string;
        port?: number;
    }>();

    if (!body.serverId || !body.host) {
        return c.json({ error: "serverId and host are required" }, 400);
    }

    const db = await getDb();

    const existing = await db.collection("speedtest_servers").findOne({ serverId: body.serverId });
    if (existing) {
        return c.json({ error: "Server already exists" }, 409);
    }

    await db.collection("speedtest_servers").insertOne({
        serverId: body.serverId,
        name: body.name || body.serverId,
        region: body.region || "unknown",
        host: body.host,
        port: body.port ?? 443,
        endpoints: {
            garbage: "/api/speedtest/garbage",
            empty: "/api/speedtest/empty",
            getIP: "/api/speedtest/getIP",
        },
        active: true,
        currentLoad: 0,
        capacity: 50,
        lastHeartbeat: new Date(0),
        createdAt: new Date(),
    });

    return c.json({ serverId: body.serverId }, 201);
});

/** Deploy a new EC2 speedtest server. */
adminServers.post("/deploy", async (c) => {
    const body = await c.req.json<{
        region?: string;
        instanceType?: string;
        name: string;
    }>();

    if (!body.name) {
        return c.json({ error: "name is required" }, 400);
    }

    try {
        const { deploySpeedtestServer } = await import("../infra/ec2-deployer.js");
        const centralApiUrl = process.env.CENTRAL_API_URL ?? `http://localhost:${process.env.PORT ?? 3200}`;
        const result = await deploySpeedtestServer({
            region: body.region ?? "us-east-1",
            instanceType: body.instanceType,
            name: body.name,
            centralApiUrl,
            serverSecret: process.env.SERVER_SECRET,
        });

        // Register in DB
        const db = await getDb();
        await db.collection("speedtest_servers").insertOne({
            serverId: result.serverId,
            name: body.name,
            region: body.region ?? "us-east-1",
            host: result.publicIp ?? "pending",
            port: 80,
            endpoints: {
                garbage: "/api/speedtest/garbage",
                empty: "/api/speedtest/empty",
                getIP: "/api/speedtest/getIP",
            },
            active: true,
            currentLoad: 0,
            capacity: 50,
            lastHeartbeat: new Date(0),
            createdAt: new Date(),
            metadata: { instanceId: result.instanceId, deployedAt: new Date() },
        });

        return c.json(result, 201);
    } catch (err) {
        return c.json({ error: (err as Error).message }, 500);
    }
});

/** Deregister a server. */
adminServers.delete("/:serverId", async (c) => {
    const serverId = c.req.param("serverId");
    const db = await getDb();

    await db.collection("speedtest_servers").updateOne(
        { serverId },
        { $set: { active: false } },
    );

    return c.json({ deleted: true });
});

export { servers as publicServers, adminServers };
