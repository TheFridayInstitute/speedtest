import crypto from "node:crypto";
import { Hono } from "hono";
import { stream } from "hono/streaming";
import type { AppEnv } from "../types.ts";
import { resolveIP } from "../middleware.ts";

const speedtest = new Hono<AppEnv>();

// ── Concurrency limiter for garbage streams ──────────────────────────

const GARBAGE_CONCURRENT_LIMIT = 5;
const GARBAGE_STREAMS = new Map<string, number>();

// ── No-cache headers (shared) ─────────────────────────────────────────

function noCacheHeaders(): Record<string, string> {
    return {
        "Cache-Control":
            "no-store, no-cache, must-revalidate, max-age=0, s-maxage=0",
        Pragma: "no-cache",
        Connection: "keep-alive",
    };
}

function corsSpeedtestHeaders(): Record<string, string> {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Encoding, Content-Type",
    };
}

// ── empty (replaces empty.php) ────────────────────────────────────────
// Used for ping/jitter tests and as upload target.

speedtest.all("/empty", (c) => {
    const headers: Record<string, string> = {
        ...noCacheHeaders(),
    };
    if (c.req.query("cors") !== undefined) {
        Object.assign(headers, corsSpeedtestHeaders());
    }
    return new Response(null, { status: 200, headers });
});

// ── garbage (replaces garbage.php) ────────────────────────────────────
// Streams random bytes for download speed testing.
// Query params:
//   ckSize: number of 1MB chunks (default 4, max 1024)

speedtest.get("/garbage", (c) => {
    const ip = resolveIP(c);
    const active = GARBAGE_STREAMS.get(ip) ?? 0;
    if (active >= GARBAGE_CONCURRENT_LIMIT) {
        return c.json({ error: "Too many concurrent streams" }, 429);
    }

    let ckSize = parseInt(c.req.query("ckSize") ?? "4", 10);
    if (isNaN(ckSize) || ckSize <= 0) ckSize = 4;
    if (ckSize > 1024) ckSize = 1024;

    const headers: Record<string, string> = {
        ...noCacheHeaders(),
        "Content-Description": "File Transfer",
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "attachment; filename=random.dat",
        "Content-Transfer-Encoding": "binary",
    };
    if (c.req.query("cors") !== undefined) {
        Object.assign(headers, corsSpeedtestHeaders());
    }

    GARBAGE_STREAMS.set(ip, active + 1);

    return stream(c, async (s) => {
        try {
            // Set headers on the raw response
            for (const [key, value] of Object.entries(headers)) {
                c.header(key, value);
            }
            // Stream random chunks
            for (let i = 0; i < ckSize; i++) {
                const chunk = crypto.randomBytes(1048576); // 1 MB
                await s.write(chunk);
            }
        } finally {
            const remaining = (GARBAGE_STREAMS.get(ip) ?? 1) - 1;
            if (remaining <= 0) GARBAGE_STREAMS.delete(ip);
            else GARBAGE_STREAMS.set(ip, remaining);
        }
    });
});

// ── getIP (replaces getIP.php) ────────────────────────────────────────
// Returns client IP address and optional ISP info.

speedtest.get("/getIP", async (c) => {
    const ip = resolveIP(c);

    const headers: Record<string, string> = {
        ...noCacheHeaders(),
        "Content-Type": "application/json",
    };
    if (c.req.query("cors") !== undefined) {
        Object.assign(headers, corsSpeedtestHeaders());
    }

    // Try to fetch ISP info from our own IP info endpoint if requested
    let ispInfo = "";
    const wantIsp = c.req.query("isp") === "true";

    if (wantIsp) {
        try {
            // Fetch from our own ipinfo endpoint (internal)
            const ipInfoToken = process.env.IPINFO_TOKEN;
            if (ipInfoToken) {
                const resp = await fetch(`https://ipinfo.io/${ip}`, {
                    headers: { Authorization: `Bearer ${ipInfoToken}` },
                });
                if (resp.ok) {
                    const data = await resp.json();
                    ispInfo = (data as any).org ?? "";
                }
            }
        } catch {
            // ISP info is best-effort
        }
    }

    const processedString = ispInfo ? `${ip} - ${ispInfo}` : ip;

    return c.json(
        {
            processedString,
            rawIspInfo: ispInfo || null,
        },
        200,
        headers,
    );
});

export default speedtest;
