import { Hono } from "hono";
import { getDb } from "../db.js";
import { resolveIP } from "../middleware.js";
import { getTrie } from "../trie/manager.js";
import type { AppEnv, EnrichedIPInfo, IPInfoData, ShodanData } from "../types.js";

const ip = new Hono<AppEnv>();

// ── GET / — return client IP ──────────────────────────────────────────

ip.get("/", (c) => {
    const clientIp = resolveIP(c);
    return c.text(clientIp);
});

// ── GET /info/:ip — enriched IP metadata ──────────────────────────────

ip.get("/info/:ip", async (c) => {
    const targetIp = c.req.param("ip");

    // Skip external lookups for localhost/private IPs
    const isLocal = targetIp === "::1" || targetIp === "127.0.0.1" || targetIp.startsWith("192.168.") || targetIp.startsWith("10.");
    if (isLocal) {
        return c.json({
            ip: targetIp,
            org: "Local Network",
            isp: "Local Network",
            asn: null,
            city: "localhost",
            region: null,
            country: null,
            loc: null,
            shodan: null,
            entity: null,
        } satisfies EnrichedIPInfo);
    }

    const db = await getDb();

    // 1. Check ipinfo cache
    let ipInfoData: IPInfoData | null = null;
    const cached = await db
        .collection("ipinfo_cache")
        .findOne({ ip: targetIp });

    if (cached) {
        ipInfoData = cached.data as IPInfoData;
    } else {
        // Fetch from ipinfo.io
        const token = process.env.IPINFO_TOKEN;
        if (token) {
            try {
                const resp = await fetch(
                    `https://ipinfo.io/${targetIp}?token=${token}`,
                );
                if (resp.ok) {
                    ipInfoData = (await resp.json()) as IPInfoData;
                    // Cache it
                    await db
                        .collection("ipinfo_cache")
                        .updateOne(
                            { ip: targetIp },
                            {
                                $set: {
                                    data: ipInfoData,
                                    fetchedAt: new Date(),
                                },
                                $setOnInsert: { ip: targetIp },
                            },
                            { upsert: true },
                        )
                        .catch(() => {}); // non-blocking
                }
            } catch {
                // ipinfo is best-effort
            }
        }
    }

    // 2. Check Shodan cache (async, best-effort)
    let shodanData: ShodanData | null = null;
    const shodanCached = await db
        .collection("shodan_cache")
        .findOne({ ip: targetIp });

    if (shodanCached) {
        shodanData = shodanCached.data as ShodanData;
    } else {
        // Fire-and-forget Shodan fetch (don't block response)
        const shodanKey = process.env.SHODAN_KEY;
        if (shodanKey) {
            fetchShodan(targetIp, shodanKey, db).catch(() => {});
        }
    }

    // 3. Entity lookup from trie
    const trie = getTrie();
    const trieLookup = trie.lookup(targetIp);

    // 4. Build enriched response
    const enriched: EnrichedIPInfo = {
        ip: targetIp,
        org: ipInfoData?.org ?? null,
        isp: shodanData?.isp ?? ipInfoData?.org ?? null,
        asn: ipInfoData?.asn ?? shodanData?.asn ?? null,
        city: ipInfoData?.city ?? null,
        region: ipInfoData?.region ?? null,
        country: ipInfoData?.country ?? null,
        loc: ipInfoData?.loc ?? null,
        shodan: shodanData
            ? {
                  ports: shodanData.ports ?? [],
                  os: shodanData.os ?? null,
                  hostnames: shodanData.hostnames ?? [],
                  vulns: shodanData.vulns ?? [],
              }
            : null,
        entity: trieLookup.match
            ? {
                  entityName: trieLookup.match.entityName,
                  entityId: trieLookup.match.entityId,
                  entityType: trieLookup.match.entityType,
                  cidr: trieLookup.match.cidr,
              }
            : null,
    };

    return c.json(enriched);
});

// ── GET /lookup/:ip — entity lookup (backward-compatible) ─────────────

ip.get("/lookup/:ip", async (c) => {
    const targetIp = c.req.param("ip");
    const trie = getTrie();
    const result = trie.lookup(targetIp);

    if (!result.match) {
        return c.json({ row: null });
    }

    // Return in the legacy LookedUpIP format for backward compatibility
    return c.json({
        row: {
            "Entity Name": result.match.entityName,
            "Entity ID": result.match.entityId,
            "Entity Type": result.match.entityType,
            Prefix: result.match.prefix,
            Length: String(result.match.prefixLength),
            Type: result.match.networkType,
            ...result.match.metadata,
        },
    });
});

// ── Shodan fetch helper ───────────────────────────────────────────────

async function fetchShodan(
    ip: string,
    apiKey: string,
    db: any,
): Promise<void> {
    try {
        const resp = await fetch(
            `https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`,
        );
        if (resp.ok) {
            const data = (await resp.json()) as ShodanData;
            await db.collection("shodan_cache").updateOne(
                { ip },
                {
                    $set: { data, fetchedAt: new Date() },
                    $setOnInsert: { ip },
                },
                { upsert: true },
            );
        }
    } catch {
        // Shodan is best-effort
    }
}

export default ip;
