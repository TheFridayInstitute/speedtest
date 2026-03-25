/**
 * Seed script — populates the database with realistic fake speedtest data.
 *
 * Generates ~3000 sessions with results and surveys, spread over 90 days,
 * concentrated in North Carolina but with samples from across the US.
 *
 * Usage:
 *   MONGODB_URI=mongodb://localhost:27018/speedtest-db npx tsx src/seed-dashboard.ts
 */

import { MongoClient } from "mongodb";
import crypto from "node:crypto";
import { latLngToCell } from "h3-js";
import "dotenv/config";

// ── Config ────────────────────────────────────────────────────────────

const TOTAL_SESSIONS = 3000;
const DAYS_BACK = 90;
const NC_WEIGHT = 0.65; // 65% of sessions from NC

// ── Location pools ────────────────────────────────────────────────────

interface Location {
    city: string;
    region: string;
    lat: number;
    lng: number;
    providers: string[];
}

const NC_LOCATIONS: Location[] = [
    { city: "Raleigh", region: "NC", lat: 35.7796, lng: -78.6382, providers: ["Spectrum", "AT&T Fiber", "Google Fiber"] },
    { city: "Charlotte", region: "NC", lat: 35.2271, lng: -80.8431, providers: ["Spectrum", "AT&T Fiber", "Windstream"] },
    { city: "Durham", region: "NC", lat: 35.9940, lng: -78.8986, providers: ["Spectrum", "AT&T Fiber", "Google Fiber"] },
    { city: "Greensboro", region: "NC", lat: 36.0726, lng: -79.7920, providers: ["Spectrum", "AT&T"] },
    { city: "Winston-Salem", region: "NC", lat: 36.0999, lng: -80.2442, providers: ["Spectrum", "AT&T"] },
    { city: "Fayetteville", region: "NC", lat: 35.0527, lng: -78.8784, providers: ["Spectrum", "CenturyLink"] },
    { city: "Cary", region: "NC", lat: 35.7915, lng: -78.7811, providers: ["Spectrum", "AT&T Fiber", "Google Fiber"] },
    { city: "Wilmington", region: "NC", lat: 34.2257, lng: -77.9447, providers: ["Spectrum", "AT&T"] },
    { city: "Asheville", region: "NC", lat: 35.5951, lng: -82.5515, providers: ["Spectrum", "AT&T", "Morris Broadband"] },
    { city: "Chapel Hill", region: "NC", lat: 35.9132, lng: -79.0558, providers: ["Spectrum", "AT&T Fiber"] },
    { city: "Apex", region: "NC", lat: 35.7327, lng: -78.8503, providers: ["Spectrum", "AT&T Fiber", "Google Fiber"] },
    { city: "Morrisville", region: "NC", lat: 35.8235, lng: -78.8256, providers: ["Spectrum", "Google Fiber"] },
    { city: "Rocky Mount", region: "NC", lat: 35.9382, lng: -77.7905, providers: ["Spectrum", "CenturyLink"] },
    { city: "Greenville", region: "NC", lat: 35.6127, lng: -77.3664, providers: ["Spectrum", "Suddenlink"] },
    { city: "Hickory", region: "NC", lat: 35.7331, lng: -81.3412, providers: ["Spectrum", "AT&T"] },
    { city: "Boone", region: "NC", lat: 36.2168, lng: -81.6746, providers: ["SkyBest", "Spectrum"] },
    { city: "Lumberton", region: "NC", lat: 34.6182, lng: -79.0086, providers: ["Spectrum", "CenturyLink"] },
    { city: "Sanford", region: "NC", lat: 35.4799, lng: -79.1803, providers: ["Spectrum", "Windstream"] },
];

const US_LOCATIONS: Location[] = [
    { city: "New York", region: "NY", lat: 40.7128, lng: -74.0060, providers: ["Verizon Fios", "Spectrum", "Optimum"] },
    { city: "Los Angeles", region: "CA", lat: 34.0522, lng: -118.2437, providers: ["Spectrum", "AT&T Fiber"] },
    { city: "Chicago", region: "IL", lat: 41.8781, lng: -87.6298, providers: ["Xfinity", "AT&T Fiber", "RCN"] },
    { city: "Houston", region: "TX", lat: 29.7604, lng: -95.3698, providers: ["Xfinity", "AT&T Fiber"] },
    { city: "Atlanta", region: "GA", lat: 33.7490, lng: -84.3880, providers: ["Xfinity", "AT&T Fiber"] },
    { city: "Miami", region: "FL", lat: 25.7617, lng: -80.1918, providers: ["Xfinity", "AT&T"] },
    { city: "Seattle", region: "WA", lat: 47.6062, lng: -122.3321, providers: ["Xfinity", "CenturyLink Fiber"] },
    { city: "Denver", region: "CO", lat: 39.7392, lng: -104.9903, providers: ["Xfinity", "CenturyLink"] },
    { city: "Boston", region: "MA", lat: 42.3601, lng: -71.0589, providers: ["Xfinity", "Verizon Fios", "RCN"] },
    { city: "Phoenix", region: "AZ", lat: 33.4484, lng: -112.0740, providers: ["Cox", "CenturyLink"] },
    { city: "Washington", region: "DC", lat: 38.9072, lng: -77.0369, providers: ["Verizon Fios", "Xfinity"] },
    { city: "Nashville", region: "TN", lat: 36.1627, lng: -86.7816, providers: ["Xfinity", "AT&T Fiber", "Google Fiber"] },
    { city: "Richmond", region: "VA", lat: 37.5407, lng: -77.4360, providers: ["Verizon Fios", "Xfinity"] },
    { city: "Columbia", region: "SC", lat: 34.0007, lng: -81.0348, providers: ["Spectrum", "AT&T"] },
];

const SCHOOL_DISTRICTS = [
    { name: "Wake County Public Schools", id: "920", psuName: "Wake County" },
    { name: "Charlotte-Mecklenburg Schools", id: "600", psuName: "Charlotte-Mecklenburg" },
    { name: "Guilford County Schools", id: "410", psuName: "Guilford County" },
    { name: "Durham Public Schools", id: "320", psuName: "Durham" },
    { name: "Cumberland County Schools", id: "260", psuName: "Cumberland County" },
    { name: "Forsyth County Schools", id: "340", psuName: "Forsyth County" },
    { name: "Johnston County Schools", id: "510", psuName: "Johnston County" },
];

const SCHOOL_NAMES = [
    "Lincoln Elementary", "Washington Middle", "Jefferson High",
    "Oak Ridge Elementary", "Pine Valley Middle", "Riverside Academy",
    "Sunrise Elementary", "Heritage Middle", "Northwood High",
    "Meadowbrook Elementary", "Lakeview Middle", "Summit High",
];

const NAMES = [
    "Alex Johnson", "Maria Garcia", "James Wilson", "Sarah Chen", "Michael Brown",
    "Emily Davis", "David Martinez", "Lisa Thompson", "Robert Anderson", "Jennifer Lee",
    "Christopher Taylor", "Amanda White", "Daniel Harris", "Jessica Clark", "Matthew Lewis",
    "Ashley Robinson", "Andrew Walker", "Stephanie Hall", "Joshua Allen", "Nicole Young",
];

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (iPad; CPU OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

// ── Helpers ───────────────────────────────────────────────────────────

function uuid(): string {
    return crypto.randomUUID();
}

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
    return Math.floor(rand(min, max + 1));
}

/** Add jitter to lat/lng (within ~2km) */
function jitterCoord(val: number, spread = 0.02): number {
    return val + (Math.random() - 0.5) * spread;
}

/** Random date within the past N days */
function randomDate(daysBack: number): Date {
    const now = Date.now();
    const msBack = daysBack * 24 * 60 * 60 * 1000;
    return new Date(now - Math.random() * msBack);
}

function fakeIp(): string {
    return `${randInt(10, 200)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;
}

async function hashIp(ip: string): Promise<string> {
    const data = new TextEncoder().encode(ip);
    const hash = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/** Generate realistic speed values based on provider type */
function genSpeeds(provider: string): { download: number; upload: number; ping: number; jitter: number } {
    // Fiber providers have higher speeds
    const isFiber = provider.includes("Fiber") || provider.includes("Fios") || provider.includes("Google");
    const isSatellite = provider.includes("Sky") || provider.includes("Hughes");

    let download: number, upload: number, ping: number, jitter: number;

    if (isFiber) {
        download = rand(200, 950);
        upload = rand(150, 800);
        ping = rand(2, 12);
        jitter = rand(0.5, 3);
    } else if (isSatellite) {
        download = rand(10, 50);
        upload = rand(2, 10);
        ping = rand(40, 120);
        jitter = rand(5, 25);
    } else {
        // Cable/DSL
        download = rand(25, 400);
        upload = rand(5, 50);
        ping = rand(8, 45);
        jitter = rand(1, 10);
    }

    return {
        download: Math.round(download * 100) / 100,
        upload: Math.round(upload * 100) / 100,
        ping: Math.round(ping * 100) / 100,
        jitter: Math.round(jitter * 100) / 100,
    };
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
    const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27018/speedtest-db";
    console.log(`Connecting to ${uri}...`);

    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db();

    // Clear existing seed data (preserve any real data by checking for seed marker)
    console.log("Clearing previous seed data...");
    await db.collection("test_sessions").deleteMany({ "raw.seeded": true });
    await db.collection("test_results").deleteMany({ "raw.seeded": true });
    await db.collection("surveys").deleteMany({ "raw.seeded": true } as any);

    const sessions: any[] = [];
    const results: any[] = [];
    const surveys: any[] = [];

    console.log(`Generating ${TOTAL_SESSIONS} sessions...`);

    for (let i = 0; i < TOTAL_SESSIONS; i++) {
        const isNC = Math.random() < NC_WEIGHT;
        const loc = isNC ? pick(NC_LOCATIONS) : pick(US_LOCATIONS);
        const lat = jitterCoord(loc.lat);
        const lng = jitterCoord(loc.lng);
        const provider = pick(loc.providers);
        const ip = fakeIp();
        const ipHash = await hashIp(ip);
        const sessionId = uuid();
        const createdAt = randomDate(DAYS_BACK);
        const lastSeenAt = new Date(createdAt.getTime() + randInt(30, 300) * 1000);
        const expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

        // Compute H3 indices
        const h3Indices = {
            res4: latLngToCell(lat, lng, 4),
            res5: latLngToCell(lat, lng, 5),
            res6: latLngToCell(lat, lng, 6),
            res7: latLngToCell(lat, lng, 7),
        };

        const session = {
            _id: sessionId,
            clientIp: ip,
            ipHash,
            ipInfo: {
                ip,
                org: provider,
                isp: provider,
                city: loc.city,
                region: loc.region,
                country: "US",
                loc: `${lat.toFixed(4)},${lng.toFixed(4)}`,
            },
            h3Indices,
            entityLookup: isNC && Math.random() < 0.4
                ? (() => {
                    const district = pick(SCHOOL_DISTRICTS);
                    return { entityName: district.psuName, entityId: district.id, entityType: "PSU" };
                })()
                : null,
            userAgent: pick(USER_AGENTS),
            createdAt,
            lastSeenAt,
            expiresAt,
            raw: { seeded: true },
        };

        sessions.push(session);

        // 1-3 results per session
        const resultCount = randInt(1, 3);
        for (let r = 0; r < resultCount; r++) {
            const speeds = genSpeeds(provider);
            const resultTime = new Date(createdAt.getTime() + r * randInt(5, 60) * 1000);

            results.push({
                sessionId,
                testType: "traditional" as const,
                serverId: "primary",
                serverName: "Friday Institute Primary",
                ...speeds,
                dnsDownloadSpeed: null,
                dnsUid: null,
                timestamp: resultTime,
                raw: { seeded: true },
            });
        }

        // 70% of sessions have surveys
        if (Math.random() < 0.7) {
            const isSchool = isNC && Math.random() < 0.5;
            const flow = isSchool ? "school" : "home";
            const district = isSchool ? pick(SCHOOL_DISTRICTS) : null;

            surveys.push({
                sessionId,
                flow,
                name: pick(NAMES),
                address: {
                    formatted: `${randInt(100, 9999)} ${pick(["Main St", "Oak Ave", "Pine Dr", "Elm Blvd", "Cedar Ln"])}, ${loc.city}, ${loc.region}`,
                    lat,
                    lng,
                    components: {},
                },
                provider,
                entityName: district?.psuName ?? null,
                entityId: district?.id ?? null,
                psuId: district?.id ?? null,
                psuName: district?.psuName ?? null,
                schoolName: isSchool ? pick(SCHOOL_NAMES) : null,
                schoolNumber: isSchool ? String(randInt(100, 999)) : null,
                classroomName: isSchool && Math.random() < 0.5 ? `Room ${randInt(100, 400)}` : null,
                classroomNumber: null,
                connectionType: !isSchool ? pick(["Fiber", "Cable", "DSL", "Wireless", "Satellite"]) : null,
                skipped: false,
                createdAt,
                updatedAt: lastSeenAt,
                raw: { seeded: true },
            });
        }

        if ((i + 1) % 500 === 0) {
            console.log(`  ${i + 1} / ${TOTAL_SESSIONS}`);
        }
    }

    // Bulk insert
    console.log(`Inserting ${sessions.length} sessions...`);
    await db.collection("test_sessions").insertMany(sessions, { ordered: false });

    console.log(`Inserting ${results.length} results...`);
    await db.collection("test_results").insertMany(results, { ordered: false });

    console.log(`Inserting ${surveys.length} surveys...`);
    if (surveys.length > 0) {
        await db.collection("surveys").insertMany(surveys, { ordered: false });
    }

    console.log("\nSeed complete:");
    console.log(`  Sessions: ${sessions.length}`);
    console.log(`  Results:  ${results.length}`);
    console.log(`  Surveys:  ${surveys.length}`);

    await client.close();
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
