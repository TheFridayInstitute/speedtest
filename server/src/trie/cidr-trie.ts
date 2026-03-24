/**
 * Binary trie for IPv4 CIDR longest-prefix-match lookups.
 * Each bit of an IPv4 address is a branching decision (0 = left, 1 = right).
 * O(32) lookup, O(prefix_length) insert.
 */

export interface SubnetEntry {
    cidr: string;
    prefix: string;
    prefixLength: number;
    entityName: string;
    entityId: string;
    entityType: string;
    networkType: string;
    metadata: Record<string, unknown>;
}

export interface LookupResult {
    match: SubnetEntry | null;
    matchedPrefixLength: number;
    matchedCidr: string | null;
}

class CIDRTrieNode {
    children: [CIDRTrieNode | null, CIDRTrieNode | null] = [null, null];
    entry: SubnetEntry | null = null;
}

export class CIDRTrie {
    private root = new CIDRTrieNode();
    private _size = 0;

    /** Convert an IPv4 dotted-decimal string to a 32-bit unsigned integer. */
    static ipToUint32(ip: string): number {
        const parts = ip.split(".").map(Number);
        return (
            ((parts[0] << 24) |
                (parts[1] << 16) |
                (parts[2] << 8) |
                parts[3]) >>>
            0
        );
    }

    /** Insert a CIDR entry into the trie. */
    insert(entry: SubnetEntry): void {
        const ip = CIDRTrie.ipToUint32(entry.prefix);
        let node = this.root;

        for (let i = 31; i > 31 - entry.prefixLength; i--) {
            const bit = (ip >>> i) & 1;
            if (!node.children[bit]) {
                node.children[bit] = new CIDRTrieNode();
            }
            node = node.children[bit]!;
        }

        node.entry = entry;
        this._size++;
    }

    /**
     * Longest prefix match lookup.
     * Returns the most specific (longest prefix) matching entry.
     */
    lookup(ip: string): LookupResult {
        const ipNum = CIDRTrie.ipToUint32(ip);
        let node = this.root;
        let bestMatch: SubnetEntry | null = null;

        // Check root entry (default route, if any)
        if (node.entry) bestMatch = node.entry;

        for (let i = 31; i >= 0; i--) {
            const bit = (ipNum >>> i) & 1;
            const child = node.children[bit];
            if (!child) break;
            node = child;
            if (node.entry) bestMatch = node.entry;
        }

        return {
            match: bestMatch,
            matchedPrefixLength: bestMatch?.prefixLength ?? 0,
            matchedCidr: bestMatch?.cidr ?? null,
        };
    }

    /**
     * Rebuild the trie from a full set of entries.
     * Creates a new trie and copies the reference for atomic swap.
     */
    rebuild(entries: SubnetEntry[]): void {
        this.root = new CIDRTrieNode();
        this._size = 0;
        for (const entry of entries) {
            this.insert(entry);
        }
    }

    get size(): number {
        return this._size;
    }
}
