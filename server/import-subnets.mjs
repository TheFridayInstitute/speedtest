import { MongoClient } from "mongodb";
import fs from "fs";

const client = new MongoClient("mongodb://localhost:27018/speedtest-db");
await client.connect();
const db = client.db();

const csv = fs.readFileSync("/tmp/community_colleges.csv", "utf8");
const lines = csv.trim().split("\n");

const docs = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 6) continue;

    const prefix = cols[0].trim();
    const prefixLength = parseInt(cols[1].trim(), 10);
    const networkType = cols[2].trim();
    const entityName = cols[3].trim();
    const entityType = cols[4].trim();
    const entityId = cols[5].trim();

    if (!prefix || isNaN(prefixLength)) continue;

    docs.push({
        prefix,
        prefixLength,
        cidr: `${prefix}/${prefixLength}`,
        entityName,
        entityId,
        entityType,
        networkType,
        metadata: {},
        source: "csv_import",
        sourceRef: "s3://broadband-survey/community_colleges.csv",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
}

let created = 0;
for (const doc of docs) {
    const { createdAt: _, ...updateDoc } = doc;
    const result = await db.collection("subnets").updateOne(
        { cidr: doc.cidr },
        { $set: updateDoc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
    );
    if (result.upsertedCount > 0) created++;
}

console.log(`Imported ${created} subnets out of ${docs.length} rows`);
await client.close();
