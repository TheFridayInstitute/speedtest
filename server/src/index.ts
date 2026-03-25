import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import "dotenv/config";

import type { AppEnv } from "./types.js";
import { getDb } from "./db.js";
import { corsHeaders, rateLimit, resolveSession, resolveIP, responseCache } from "./middleware.js";
import { rebuildTrieFromDb } from "./trie/manager.js";

import speedtestRoutes from "./routes/speedtest.js";
import sessionRoutes from "./routes/sessions.js";
import resultRoutes from "./routes/results.js";
import surveyRoutes from "./routes/surveys.js";
import ipRoutes from "./routes/ip.js";
import subnetRoutes from "./routes/subnets.js";
import syncRoutes from "./routes/sync.js";
import adminRoutes from "./routes/admin.js";
import publicDashboardRoutes from "./routes/public-dashboard.js";
import eventRoutes from "./routes/events.js";
import { publicServers, adminServers } from "./routes/servers.js";

const app = new Hono<AppEnv>();

// ── Global middleware ─────────────────────────────────────────────────

// Resolve client IP on all requests
app.use("*", async (c, next) => {
    c.set("clientIp", resolveIP(c));
    await next();
});

// CORS preflight
app.options("*", (c) => {
    const origin = c.req.header("Origin") ?? "";
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
});

// CORS headers on all responses
app.use("*", async (c, next) => {
    await next();
    const origin = c.req.header("Origin") ?? "";
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
        c.res.headers.set(key, value);
    }
});

// Body size limit (256 KB - generous for survey payloads + Google Places data)
app.use("*", bodyLimit({ maxSize: 256 * 1024 }));

// Rate limiting (skip for speedtest routes - they need high throughput)
app.use("/api/sessions/*", rateLimit);
app.use("/api/results/*", rateLimit);
app.use("/api/surveys/*", rateLimit);
app.use("/api/ip/*", rateLimit);
app.use("/api/admin/*", rateLimit);
app.use("/api/dashboard/*", rateLimit);

// Response caching for public dashboard (TTLs vary by endpoint)
app.use("/api/dashboard/hex-map", responseCache(60_000));    // 60s
app.use("/api/dashboard/time-series", responseCache(30_000)); // 30s
app.use("/api/dashboard/distributions", responseCache(120_000)); // 120s
app.use("/api/dashboard/summary", responseCache(30_000));     // 30s

// Session resolution
app.use("*", resolveSession);

// ── Routes ────────────────────────────────────────────────────────────

// LibreSpeed backend (no /api prefix - worker expects root-relative paths)
app.route("/api/speedtest", speedtestRoutes);

// API routes
app.route("/api/sessions", sessionRoutes);
app.route("/api/results", resultRoutes);
app.route("/api/surveys", surveyRoutes);
app.route("/api/ip", ipRoutes);
app.route("/api/admin/subnets", subnetRoutes);
app.route("/api/admin/sync", syncRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/dashboard", publicDashboardRoutes);
app.route("/api/events", eventRoutes);
app.route("/api/servers", publicServers);
app.route("/api/internal/servers", publicServers); // heartbeat endpoint
app.route("/api/admin/servers", adminServers);

// Health check
app.get("/api", (c) => c.json({ status: "ok", service: "speedtest-api" }));
app.get("/api/", (c) => c.json({ status: "ok", service: "speedtest-api" }));

// 404 fallback
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Global error handler
app.onError((err, c) => {
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
});

// ── Start ─────────────────────────────────────────────────────────────

async function main() {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
        if (!process.env.ADMIN_TOKEN) {
            throw new Error("ADMIN_TOKEN is required in production");
        }
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is required in production");
        }
    }

    const port = parseInt(process.env.PORT ?? "3200");
    if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT: ${process.env.PORT}`);
    }

    // Start HTTP server immediately (speedtest endpoints work without DB)
    serve({ fetch: app.fetch, port }, (info: { port: number }) => {
        console.log(`Speedtest API running on http://localhost:${info.port}`);
    });

    // Connect to MongoDB and build trie (non-blocking)
    try {
        const db = await getDb();
        const trieSize = await rebuildTrieFromDb(db);
        console.log(`Initial trie: ${trieSize} entries`);
    } catch (err) {
        console.warn("[WARN] MongoDB not available at startup:", (err as Error).message);
        console.warn("[WARN] Speedtest endpoints work, but survey/results/IP lookup require MongoDB");
    }
}

main().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
});
