import { GoogleAuth } from "google-auth-library";
import type { Db } from "mongodb";
import { rebuildTrieFromDb } from "../trie/manager.ts";
import type { SyncMetadataDoc, SyncResult, SubnetDoc } from "../types.ts";

/**
 * Fetch a Google Sheet range using the Sheets API v4.
 * Returns rows as arrays of strings.
 */
async function fetchSheetData(
    spreadsheetId: string,
    range: string,
): Promise<string[][]> {
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyFile) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY not configured");
    }

    const auth = new GoogleAuth({
        keyFile,
        scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();
    const token = await client.getAccessToken();

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token.token}` },
    });

    if (!resp.ok) {
        throw new Error(`Sheets API error: ${resp.status} ${resp.statusText}`);
    }

    const body = (await resp.json()) as { values?: string[][] };
    return body.values ?? [];
}

/**
 * Sync a single Google Sheet into the subnets collection.
 * Follows the create/update/deactivate isomorphism pattern.
 */
export async function syncFromSheet(
    db: Db,
    syncConfig: SyncMetadataDoc,
): Promise<SyncResult> {
    const rows = await fetchSheetData(
        syncConfig.spreadsheetId,
        syncConfig.range,
    );

    if (rows.length < 2) {
        return { created: 0, updated: 0, deactivated: 0, errors: ["Sheet is empty or has no data rows"] };
    }

    const headers = rows[0].map((h) => h.trim());
    const mapping = syncConfig.columnMapping;

    // Build column index lookup
    const colIdx = (name: string | undefined): number =>
        name ? headers.indexOf(name) : -1;

    const prefixCol = colIdx(mapping.prefix);
    const lengthCol = colIdx(mapping.prefixLength);
    const entityNameCol = colIdx(mapping.entityName);
    const entityIdCol = colIdx(mapping.entityId);
    const entityTypeCol = colIdx(mapping.entityType);
    const networkTypeCol = colIdx(mapping.networkType);

    if (prefixCol < 0 || lengthCol < 0) {
        return {
            created: 0, updated: 0, deactivated: 0,
            errors: [`Required columns not found. Headers: ${headers.join(", ")}`],
        };
    }

    const now = new Date();
    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const seenCidrs = new Set<string>();

    // Upsert each row
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const prefix = row[prefixCol]?.trim();
        const length = parseInt(row[lengthCol]?.trim(), 10);

        if (!prefix || isNaN(length)) {
            errors.push(`Row ${i + 1}: invalid prefix/length`);
            continue;
        }

        const cidr = `${prefix}/${length}`;
        seenCidrs.add(cidr);

        const doc: Partial<SubnetDoc> = {
            prefix,
            prefixLength: length,
            cidr,
            entityName: entityNameCol >= 0 ? row[entityNameCol]?.trim() ?? "" : "",
            entityId: entityIdCol >= 0 ? row[entityIdCol]?.trim() ?? "" : "",
            entityType: entityTypeCol >= 0 ? row[entityTypeCol]?.trim() ?? "" : "",
            networkType: networkTypeCol >= 0 ? row[networkTypeCol]?.trim() ?? "" : "",
            source: "sheets_sync",
            sourceRef: syncConfig.spreadsheetId,
            active: true,
            updatedAt: now,
        };

        try {
            const result = await db.collection("subnets").updateOne(
                { cidr },
                {
                    $set: doc,
                    $setOnInsert: { createdAt: now, metadata: {} },
                },
                { upsert: true },
            );
            if (result.upsertedCount > 0) created++;
            else updated++;
        } catch (err: any) {
            errors.push(`Row ${i + 1}: ${err.message}`);
        }
    }

    // Deactivate subnets from this source that are no longer in the sheet
    const deactivated = await db.collection("subnets").updateMany(
        {
            source: "sheets_sync",
            sourceRef: syncConfig.spreadsheetId,
            cidr: { $nin: Array.from(seenCidrs) },
            active: true,
        },
        { $set: { active: false, updatedAt: now } },
    );

    // Update sync metadata
    const syncResult: SyncResult = {
        created,
        updated,
        deactivated: deactivated.modifiedCount,
        errors,
    };

    await db.collection("sync_metadata").updateOne(
        { _id: syncConfig._id },
        { $set: { lastSyncAt: now, lastSyncResult: syncResult } },
    );

    // Rebuild the trie
    await rebuildTrieFromDb(db);

    return syncResult;
}

/**
 * Sync all enabled sheets.
 */
export async function syncAllSheets(db: Db): Promise<SyncResult[]> {
    const configs = await db
        .collection("sync_metadata")
        .find({ syncEnabled: true })
        .toArray() as SyncMetadataDoc[];

    const results: SyncResult[] = [];
    for (const config of configs) {
        try {
            results.push(await syncFromSheet(db, config));
        } catch (err: any) {
            results.push({
                created: 0, updated: 0, deactivated: 0,
                errors: [err.message],
            });
        }
    }
    return results;
}
