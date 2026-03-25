/**
 * Lightweight speedtest-only server.
 *
 * Runs just the LibreSpeed-compatible endpoints (garbage, empty, getIP)
 * plus a health check and heartbeat reporter. No MongoDB dependency.
 *
 * Environment variables:
 *   PORT                - Listen port (default 3000)
 *   SERVER_ID           - Unique server identifier (required)
 *   SERVER_NAME         - Display name
 *   SERVER_REGION       - Region (e.g., "us-east-1")
 *   CENTRAL_API_URL     - URL of the central API (e.g., "https://mbabb.fi.ncsu.edu")
 *   SERVER_SECRET       - Shared secret for heartbeat auth
 *   SERVER_CAPACITY     - Max concurrent tests (default 50)
 */

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import "dotenv/config";
import crypto from "node:crypto";

const app = new Hono();

// ── CORS ──────────────────────────────────────────────────────────────

app.options("*", (c) => {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
    });
});

app.use("*", async (c, next) => {
    await next();
    c.res.headers.set("Access-Control-Allow-Origin", "*");
});

// ── Concurrent test tracking ──────────────────────────────────────────

let currentLoad = 0;

// ── Speedtest endpoints ───────────────────────────────────────────────

/** Ping/jitter target and upload endpoint. */
app.all("/api/speedtest/empty", (c) => {
    c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return c.body(null, 200);
});

/** Download speed test — stream random data. */
app.get("/api/speedtest/garbage", (c) => {
    const ckSize = Math.min(parseInt(c.req.query("ckSize") ?? "4", 10) || 4, 1024);
    const chunkSize = 1024 * 1024; // 1 MB

    currentLoad++;

    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Length", String(ckSize * chunkSize));
    c.header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

    const stream = new ReadableStream({
        start(controller) {
            let sent = 0;
            function push() {
                if (sent >= ckSize) {
                    controller.close();
                    currentLoad = Math.max(0, currentLoad - 1);
                    return;
                }
                const chunk = new Uint8Array(chunkSize);
                crypto.getRandomValues(chunk);
                controller.enqueue(chunk);
                sent++;
                // Use queueMicrotask to avoid blocking
                queueMicrotask(push);
            }
            push();
        },
        cancel() {
            currentLoad = Math.max(0, currentLoad - 1);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
    });
});

/** Return client IP. */
app.get("/api/speedtest/getIP", (c) => {
    const ip =
        c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
        c.req.header("X-Real-IP") ??
        c.req.header("CF-Connecting-IP") ??
        "127.0.0.1";

    c.header("Cache-Control", "no-store");
    return c.json({
        processedString: ip,
        rawIspInfo: null,
    });
});

// ── Health check ──────────────────────────────────────────────────────

app.get("/health", (c) => {
    return c.json({
        status: "ok",
        serverId: process.env.SERVER_ID ?? "unknown",
        currentLoad,
        capacity: parseInt(process.env.SERVER_CAPACITY ?? "50", 10),
        uptime: process.uptime(),
    });
});

app.get("/", (c) => c.json({ service: "speedtest-server", status: "ok" }));

// ── Heartbeat reporter ────────────────────────────────────────────────

async function sendHeartbeat() {
    const centralUrl = process.env.CENTRAL_API_URL;
    const serverId = process.env.SERVER_ID;
    const secret = process.env.SERVER_SECRET;

    if (!centralUrl || !serverId) return;

    try {
        await fetch(`${centralUrl}/api/internal/servers/${serverId}/heartbeat`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...(secret ? { "X-Server-Secret": secret } : {}),
            },
            body: JSON.stringify({
                currentLoad,
                capacity: parseInt(process.env.SERVER_CAPACITY ?? "50", 10),
            }),
        });
    } catch {
        // Silent failure — central API may be temporarily unavailable
    }
}

// ── Start ─────────────────────────────────────────────────────────────

const port = parseInt(process.env.PORT ?? "3000", 10);

serve({ fetch: app.fetch, port }, (info: { port: number }) => {
    console.log(`Speedtest server "${process.env.SERVER_ID ?? "local"}" running on http://localhost:${info.port}`);
});

// Send heartbeat every 30 seconds
setInterval(sendHeartbeat, 30_000);
// Initial heartbeat after 5 seconds (give server time to start)
setTimeout(sendHeartbeat, 5_000);
