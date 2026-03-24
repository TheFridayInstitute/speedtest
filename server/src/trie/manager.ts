import type { Db } from "mongodb";
import { CIDRTrie, type SubnetEntry } from "./cidr-trie.js";
import type { SubnetDoc } from "../types.js";

let currentTrie = new CIDRTrie();

export function getTrie(): CIDRTrie {
    return currentTrie;
}

/** Convert a MongoDB subnet document to a trie entry. */
function docToEntry(doc: SubnetDoc): SubnetEntry {
    return {
        cidr: doc.cidr,
        prefix: doc.prefix,
        prefixLength: doc.prefixLength,
        entityName: doc.entityName,
        entityId: doc.entityId,
        entityType: doc.entityType,
        networkType: doc.networkType,
        metadata: doc.metadata ?? {},
    };
}

/**
 * Rebuild the trie from all active subnets in the database.
 * This is an atomic operation: a new trie is built, then the reference is swapped.
 */
export async function rebuildTrieFromDb(db: Db): Promise<number> {
    const docs = (await db
        .collection("subnets")
        .find({ active: true })
        .toArray()) as SubnetDoc[];

    const newTrie = new CIDRTrie();
    newTrie.rebuild(docs.map(docToEntry));

    // Atomic swap
    currentTrie = newTrie;

    console.log(`CIDR trie rebuilt with ${newTrie.size} entries`);
    return newTrie.size;
}
