import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import "dotenv/config";

import type { AppEnv } from "./types.ts";
import { getDb } from "./db.ts";
import { corsHeaders, rateLimit, resolveSession, resolveIP, responseCache } from "./middleware.ts";
import { rebuildTrieFromDb } from "./trie/manager.ts";
import { logger, requestId } from "./logging/index.ts";

import speedtestRoutes from "./routes/speedtest.ts";
import sessionRoutes from "./routes/sessions.ts";
import resultRoutes from "./routes/results.ts";
import surveyRoutes from "./routes/surveys.ts";
import ipRoutes from "./routes/ip.ts";
import subnetRoutes from "./routes/subnets.ts";
import syncRoutes from "./routes/sync.ts";
import adminRoutes from "./routes/admin.ts";
import publicDashboardRoutes from "./routes/dashboard/index.ts";
import eventRoutes from "./routes/events.ts";
import { publicServers, adminServers } from "./routes/servers.ts";

const app = new Hono<AppEnv>();

// ── Global middleware ─────────────────────────────────────────────────

// Request ID + client IP resolution
app.use("*", requestId);
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

// Security headers
app.use("*", async (c, next) => {
    await next();
    c.res.headers.set("X-Content-Type-Options", "nosniff");
    c.res.headers.set("X-Frame-Options", "DENY");
    c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (process.env.NODE_ENV === "production") {
        c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
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
    logger.error("Unhandled error", {
        error: err.message,
        stack: err.stack,
        path: c.req.path,
        method: c.req.method,
        requestId: c.get("requestId"),
    });
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
        const origins = (process.env.ALLOWED_ORIGINS ?? "").split(",").filter(Boolean);
        if (origins.length === 0) {
            logger.warn("ALLOWED_ORIGINS is empty — CORS will reject all cross-origin requests in production");
        }
    }

    const port = parseInt(process.env.PORT ?? "3200");
    if (isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid PORT: ${process.env.PORT}`);
    }

    // Start HTTP server immediately (speedtest endpoints work without DB)
    serve({ fetch: app.fetch, port }, (info: { port: number }) => {
        logger.info("Server started", { port: info.port });
    });

    // Connect to MongoDB and build trie (non-blocking)
    try {
        const db = await getDb();
        const trieSize = await rebuildTrieFromDb(db);
        logger.info("Initial trie built", { entries: trieSize });
    } catch (err) {
        logger.warn("MongoDB not available at startup", { error: (err as Error).message });
    }
}

main().catch((err) => {
    logger.error("Failed to start", { error: (err as Error).message });
    process.exit(1);
});
