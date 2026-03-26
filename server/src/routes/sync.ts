import { Hono } from "hono";
import { getDb } from "../db.ts";
import { adminAuth } from "../middleware.ts";
import { syncFromSheet, syncAllSheets } from "../sync/sheets-sync.ts";
import type { AppEnv, SyncMetadataDoc } from "../types.ts";
import { syncConfigSchema, parseBody, isResponse } from "../validation/index.ts";

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
    const body = await parseBody(c, syncConfigSchema);
    if (isResponse(body)) return body;
    const db = await getDb();

    const doc: Omit<SyncMetadataDoc, "_id"> = {
        name: body.name,
        spreadsheetId: body.spreadsheetId,
        range: body.range,
        columnMapping: body.columnMapping,
        lastSyncAt: null,
        lastSyncResult: null,
        syncEnabled: true,
        createdAt: new Date(),
    };

    const inserted = await db.collection("sync_metadata").insertOne(doc);
    return c.json({ id: inserted.insertedId }, 201);
});

export default sync;
