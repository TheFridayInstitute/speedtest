/**
 * Seed script: imports subnet CSV data into MongoDB.
 * Usage: npx tsx src/seed.ts <path-to-csv>
 */
import { readFileSync } from "node:fs";
import "dotenv/config";
import { getDb, closeDb } from "./db.js";
import { rebuildTrieFromDb } from "./trie/manager.js";
import type { SubnetDoc } from "./types.js";

async function main() {
    const csvPath = process.argv[2];
    if (!csvPath) {
        console.error("Usage: npx tsx src/seed.ts <path-to-csv>");
        process.exit(1);
    }

    const content = readFileSync(csvPath, "utf-8");
    const lines = content.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim());

    console.log(`CSV headers: ${headers.join(", ")}`);
    console.log(`Data rows: ${lines.length - 1}`);

    const db = await getDb();
    const now = new Date();
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: Record<string, string> = {};
        headers.forEach((h, j) => {
            row[h] = values[j] ?? "";
        });

        const prefix = row["Prefix"];
        const prefixLength = parseInt(row["Length"], 10);

        if (!prefix || isNaN(prefixLength)) {
            console.warn(`Skipping row ${i}: invalid prefix/length`);
            errors++;
            continue;
        }

        const doc: Omit<SubnetDoc, "_id"> = {
            prefix,
            prefixLength,
            cidr: `${prefix}/${prefixLength}`,
            entityName: row["Entity Name"] ?? "",
            entityId: row["Entity ID"] ?? "",
            entityType: row["Entity Type"] ?? "",
            networkType: row["Type"] ?? "",
            metadata: {},
            source: "csv_import",
            sourceRef: csvPath,
            active: true,
            createdAt: now,
            updatedAt: now,
        };

        try {
            const result = await db.collection("subnets").updateOne(
                { cidr: doc.cidr },
                {
                    $set: {
                        ...doc,
                        updatedAt: now,
                    },
                    $setOnInsert: { createdAt: now },
                },
                { upsert: true },
            );
            if (result.upsertedCount > 0) created++;
            else updated++;
        } catch (err: any) {
            console.error(`Row ${i} error: ${err.message}`);
            errors++;
        }
    }

    console.log(`\nImport complete:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);

    // Rebuild trie
    const trieSize = await rebuildTrieFromDb(db);
    console.log(`  Trie entries: ${trieSize}`);

    await closeDb();
}

main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
});
