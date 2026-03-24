import crypto from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";
import { getDb } from "./db.js";

// ── CORS ──────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set(
    (process.env.ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
);

export function corsHeaders(requestOrigin?: string): Record<string, string> {
    // In dev, allow any origin; in prod, check the whitelist
    // In dev, allow any origin
    const isDev = process.env.NODE_ENV !== "production";
    const origin =
        requestOrigin && (isDev || ALLOWED_ORIGINS.has(requestOrigin) || ALLOWED_ORIGINS.size === 0)
            ? requestOrigin
            : ALLOWED_ORIGINS.values().next().value ?? "*";
    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type, X-Session-Token, Authorization",
        "Access-Control-Allow-Credentials": "true",
    };
}

// ── IP resolution ─────────────────────────────────────────────────────

export function resolveIP(c: Context): string {
    return (
        c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ??
        c.req.header("X-Real-IP") ??
        c.req.header("CF-Connecting-IP") ??
        // @ts-ignore — Hono node-server exposes remote address on the raw request
        (c.env?.incoming as any)?.socket?.remoteAddress ??
        "127.0.0.1"
    );
}

// ── Rate limiting (in-memory, per-method tiers) ──────────────────────

const RATE_MAP_CAP = 50_000;

interface RateEntry {
    count: number;
    resetAt: number;
}

function createRateLimiter(limit: number, windowMs: number) {
    const map = new Map<string, RateEntry>();
    return {
        map,
        check(ip: string): boolean {
            const now = Date.now();
            const entry = map.get(ip);
            if (!entry || now > entry.resetAt) {
                map.set(ip, { count: 1, resetAt: now + windowMs });
                return true;
            }
            entry.count++;
            return entry.count <= limit;
        },
    };
}

const readLimiter = createRateLimiter(120, 60_000); // 120 reads/min (speedtest makes many requests)
const writeLimiter = createRateLimiter(30, 60_000); // 30 writes/min

// Sweep expired entries every 60s
setInterval(() => {
    const now = Date.now();
    for (const limiter of [readLimiter, writeLimiter]) {
        for (const [key, entry] of limiter.map) {
            if (now > entry.resetAt) {
                limiter.map.delete(key);
            }
        }
    }
}, 60_000);

export const rateLimit: MiddlewareHandler = async (c, next) => {
    const ip = resolveIP(c);
    const method = c.req.method;
    const limiter =
        method === "GET" || method === "HEAD" ? readLimiter : writeLimiter;

    if (!limiter.map.has(ip) && limiter.map.size >= RATE_MAP_CAP) {
        const now = Date.now();
        let evicted = false;
        for (const [key, entry] of limiter.map) {
            if (now > entry.resetAt) {
                limiter.map.delete(key);
                evicted = true;
                break;
            }
        }
        if (!evicted) {
            return c.json({ error: "Rate limit exceeded" }, 429);
        }
    }

    if (!limiter.check(ip)) {
        return c.json({ error: "Rate limit exceeded" }, 429);
    }

    await next();
};

// ── Session resolution ────────────────────────────────────────────────

export const resolveSession: MiddlewareHandler = async (c, next) => {
    const token = c.req.header("X-Session-Token");
    if (token) {
        const db = await getDb();
        const session = await db.collection("test_sessions").findOneAndUpdate(
            { _id: token as any, expiresAt: { $gt: new Date() } },
            { $set: { lastSeenAt: new Date() } },
            { returnDocument: "after" },
        );
        if (session) {
            c.set("sessionId", token);
        }
    }
    await next();
};

// ── Admin auth ────────────────────────────────────────────────────────

export const adminAuth: MiddlewareHandler = async (c, next) => {
    // Skip auth in dev mode
    if (process.env.NODE_ENV !== "production") {
        await next();
        return;
    }
    const token = process.env.ADMIN_TOKEN;
    if (!token) {
        return c.json({ error: "Admin not configured" }, 503);
    }
    const auth = c.req.header("Authorization");
    if (!auth) {
        return c.json({ error: "Unauthorized" }, 401);
    }
    const expected = `Bearer ${token}`;
    if (auth.length !== expected.length) {
        return c.json({ error: "Forbidden" }, 403);
    }
    const authBuf = Buffer.from(auth);
    const expectedBuf = Buffer.from(expected);
    if (!crypto.timingSafeEqual(authBuf, expectedBuf)) {
        return c.json({ error: "Forbidden" }, 403);
    }
    await next();
};

// ── IP hashing ────────────────────────────────────────────────────────

export async function hashIP(ip: string): Promise<string> {
    const data = new TextEncoder().encode(ip);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}
