import { Hono } from "hono";
import { getDb } from "../db.js";
import { adminAuth } from "../middleware.js";
import { syncFromSheet, syncAllSheets } from "../sync/sheets-sync.js";
import type { AppEnv, SyncMetadataDoc } from "../types.js";

const sync = new Hono<AppEnv>();

sync.use("*", adminAuth);

/** Trigger sync for all enabled sheets. */
sync.post("/trigger", async (c) => {
    const db = await getDb();
    const results = await syncAllSheets(db);
    return c.json({ results });
});

/** Trigger sync for a specific sheet config. */
sync.post("/trigger/:id", async (c) => {
    const db = await getDb();
    const { ObjectId } = await import("mongodb");
    const config = await db
        .collection("sync_metadata")
        .findOne({ _id: new ObjectId(c.req.param("id")) }) as SyncMetadataDoc | null;

    if (!config) return c.json({ error: "Sync config not found" }, 404);

    const result = await syncFromSheet(db, config);
    return c.json({ result });
});

/** List sync configurations. */
sync.get("/", async (c) => {
    const db = await getDb();
    const configs = await db.collection("sync_metadata").find().toArray();
    return c.json(configs);
});

/** Create a new sync configuration. */
sync.post("/", async (c) => {
    const db = await getDb();
    const body = await c.req.json();

    const doc: Omit<SyncMetadataDoc, "_id"> = {
        name: body.name ?? "",
        spreadsheetId: body.spreadsheetId ?? "",
        range: body.range ?? "Sheet1",
        columnMapping: body.columnMapping ?? {
            prefix: "Prefix",
            prefixLength: "Length",
            entityName: "Entity Name",
            entityId: "Entity ID",
            entityType: "Entity Type",
            networkType: "Type",
        },
        lastSyncAt: null,
        lastSyncResult: null,
        syncEnabled: true,
        createdAt: new Date(),
    };

    const inserted = await db.collection("sync_metadata").insertOne(doc);
    return c.json({ id: inserted.insertedId }, 201);
});

export default sync;
