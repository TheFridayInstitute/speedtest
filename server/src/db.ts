import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
    if (db) return db;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("MONGODB_URI is required in production");
        }
        console.warn("[WARN] MONGODB_URI not set, using localhost default");
    }
    client = new MongoClient(uri ?? "mongodb://localhost:27017/speedtest-db");
    await client.connect();
    db = client.db();

    // Create indexes
    await Promise.all([
        // test_sessions
        db.collection("test_sessions").createIndex({ createdAt: -1 }),
        db.collection("test_sessions").createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 },
        ),
        db.collection("test_sessions").createIndex({
            "entityLookup.entityId": 1,
            createdAt: -1,
        }),

        // test_results
        db.collection("test_results").createIndex({
            sessionId: 1,
            timestamp: -1,
        }),
        db.collection("test_results").createIndex({ timestamp: -1 }),

        // surveys
        db.collection("surveys").createIndex(
            { sessionId: 1 },
            { unique: true },
        ),
        db.collection("surveys").createIndex({ flow: 1, createdAt: -1 }),
        db.collection("surveys").createIndex({ psuId: 1, createdAt: -1 }),

        // subnets
        db.collection("subnets").createIndex({ cidr: 1 }, { unique: true }),
        db.collection("subnets").createIndex({ entityId: 1 }),
        db.collection("subnets").createIndex({ active: 1 }),

        // ipinfo_cache (TTL: 30 days)
        db.collection("ipinfo_cache").createIndex({ ip: 1 }, { unique: true }),
        db.collection("ipinfo_cache").createIndex(
            { fetchedAt: 1 },
            { expireAfterSeconds: 2592000 },
        ),

        // shodan_cache (TTL: 7 days)
        db.collection("shodan_cache").createIndex({ ip: 1 }, { unique: true }),
        db.collection("shodan_cache").createIndex(
            { fetchedAt: 1 },
            { expireAfterSeconds: 604800 },
        ),

        // sync_metadata
        db.collection("sync_metadata").createIndex({ name: 1 }),
    ]);

    console.log("Connected to MongoDB");
    return db;
}

export async function closeDb(): Promise<void> {
    if (client) {
        await client.close();
        client = null;
        db = null;
    }
}
