import { Hono } from "hono";
import { ObjectId } from "mongodb";
import { getDb } from "../db.ts";
import { adminAuth } from "../middleware.ts";
import { rebuildTrieFromDb } from "../trie/manager.ts";
import type { AppEnv, SubnetDoc } from "../types.ts";
import {
    subnetBodySchema,
    subnetUpdateSchema,
    subnetListQuerySchema,
    parseBody,
    parseQuery,
    isResponse,
} from "../validation/index.ts";
import { auditLog } from "../logging/index.ts";

const subnets = new Hono<AppEnv>();

// All subnet routes require admin auth
subnets.use("*", adminAuth);

/** List all subnet mappings (paginated). */
subnets.get("/", async (c) => {
    const query = parseQuery(c, subnetListQuerySchema);
    if (isResponse(query)) return query;
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;
    const db = await getDb();

    const filter: Record<string, any> = { active: true };
    if (search) {
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        filter.$or = [
            { entityName: { $regex: escaped, $options: "i" } },
            { entityId: { $regex: escaped, $options: "i" } },
            { cidr: { $regex: escaped, $options: "i" } },
        ];
    }

    const [data, total] = await Promise.all([
        db
            .collection("subnets")
            .find(filter)
            .sort({ entityName: 1 })
            .skip(skip)
            .limit(limit)
            .toArray(),
        db.collection("subnets").countDocuments(filter),
    ]);

    return c.json({ data, total, page, limit });
});

/** Create a new subnet mapping. */
subnets.post("/", async (c) => {
    const body = await parseBody(c, subnetBodySchema);
    if (isResponse(body)) return body;
    const db = await getDb();
    const now = new Date();

    const doc: SubnetDoc = {
        prefix: body.prefix,
        prefixLength: body.prefixLength,
        cidr: `${body.prefix}/${body.prefixLength}`,
        entityName: body.entityName,
        entityId: body.entityId,
        entityType: body.entityType,
        networkType: body.networkType,
        metadata: body.metadata ?? {},
        source: "manual",
        active: true,
        createdAt: now,
        updatedAt: now,
    };

    try {
        const inserted = await db.collection("subnets").insertOne(doc);
        await rebuildTrieFromDb(db);
        auditLog({ action: "create", resource: "subnet", resourceId: doc.cidr, requestId: c.get("requestId") });
        return c.json({ id: inserted.insertedId, cidr: doc.cidr }, 201);
    } catch (err: any) {
        if (err?.code === 11000) {
            return c.json({ error: "Subnet already exists" }, 409);
        }
        throw err;
    }
});

/** Update a subnet mapping. */
subnets.put("/:id", async (c) => {
    const body = await parseBody(c, subnetUpdateSchema);
    if (isResponse(body)) return body;
    const db = await getDb();
    const id = c.req.param("id");

    const update: Record<string, any> = {
        updatedAt: new Date(),
    };
    if (body.entityName !== undefined) update.entityName = body.entityName;
    if (body.entityId !== undefined) update.entityId = body.entityId;
    if (body.entityType !== undefined) update.entityType = body.entityType;
    if (body.networkType !== undefined) update.networkType = body.networkType;
    if (body.metadata !== undefined) update.metadata = body.metadata;

    const result = await db
        .collection("subnets")
        .updateOne({ _id: new ObjectId(id) }, { $set: update });

    if (result.matchedCount === 0) {
        return c.json({ error: "Subnet not found" }, 404);
    }

    await rebuildTrieFromDb(db);
    auditLog({ action: "update", resource: "subnet", resourceId: id, requestId: c.get("requestId") });
    return c.json({ updated: true });
});

/** Soft-delete a subnet mapping. */
subnets.delete("/:id", async (c) => {
    const db = await getDb();
    const id = c.req.param("id");

    const result = await db
        .collection("subnets")
        .updateOne(
            { _id: new ObjectId(id) },
            { $set: { active: false, updatedAt: new Date() } },
        );

    if (result.matchedCount === 0) {
        return c.json({ error: "Subnet not found" }, 404);
    }

    await rebuildTrieFromDb(db);
    auditLog({ action: "delete", resource: "subnet", resourceId: id, requestId: c.get("requestId") });
    return c.json({ deleted: true });
});

/** Bulk import subnets from CSV body. */
subnets.post("/import", async (c) => {
    const db = await getDb();
    const body = await c.req.json();
    const rows: any[] = body.rows ?? [];
    const now = new Date();
    let created = 0;
    let errors: string[] = [];

    for (const row of rows) {
        try {
            const doc: SubnetDoc = {
                prefix: row.prefix ?? row.Prefix,
                prefixLength: parseInt(
                    row.prefixLength ?? row.Length ?? "0",
                    10,
                ),
                cidr: `${row.prefix ?? row.Prefix}/${row.prefixLength ?? row.Length}`,
                entityName: row.entityName ?? row["Entity Name"] ?? "",
                entityId: row.entityId ?? row["Entity ID"] ?? "",
                entityType: row.entityType ?? row["Entity Type"] ?? "",
                networkType: row.networkType ?? row.Type ?? "",
                metadata: {},
                source: "csv_import",
                active: true,
                createdAt: now,
                updatedAt: now,
            };

            await db.collection("subnets").updateOne(
                { cidr: doc.cidr },
                {
                    $set: { ...doc },
                    $setOnInsert: { createdAt: now },
                },
                { upsert: true },
            );
            created++;
        } catch (err: any) {
            errors.push(`Row ${rows.indexOf(row) + 1}: ${err.message}`);
        }
    }

    await rebuildTrieFromDb(db);
    auditLog({ action: "import", resource: "subnet", details: { created, errorCount: errors.length }, requestId: c.get("requestId") });
    return c.json({ created, errors });
});

export default subnets;
