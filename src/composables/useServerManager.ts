import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type {
    SpeedtestServer,
    DNSSpeedtestServer,
} from "@src/types/server";

/** A server entry managed by the server manager, wrapping either server type. */
export interface ManagedServer {
    /** Unique identifier for this managed server entry. */
    id: string;
    /** Whether this is a traditional (LibreSpeed) or DNS-based server. */
    type: "traditional" | "dns";
    /** The underlying server configuration object. */
    config: SpeedtestServer | DNSSpeedtestServer;
    /** Whether this server is the currently active/selected one. */
    isActive: boolean;
    /** Last measured ping to this server in ms (undefined if not yet pinged). */
    lastPing?: number;
}

/**
 * Generate a short pseudo-random ID string for managed server entries.
 * Not cryptographically secure — intended only for local identification.
 */
function generateId(): string {
    return Math.random().toString(36).substring(2, 10);
}

/**
 * Composable that manages a collection of speedtest servers (both traditional
 * and DNS-based) and tracks which one is currently active.
 *
 * Supports adding, removing, and switching between servers. Provides computed
 * views for filtering by server type and finding the active server.
 */
export function useServerManager() {
    /** The full list of managed servers. */
    const servers: Ref<ManagedServer[]> = ref([]);

    /**
     * The currently active server, or null if none is selected.
     * Derived from the servers list by finding the entry with isActive === true.
     */
    const activeServer: ComputedRef<ManagedServer | null> = computed(() => {
        return servers.value.find((s) => s.isActive) ?? null;
    });

    /** All servers of type "traditional" (LibreSpeed). */
    const traditionalServers: ComputedRef<ManagedServer[]> = computed(() => {
        return servers.value.filter((s) => s.type === "traditional");
    });

    /** All servers of type "dns". */
    const dnsServers: ComputedRef<ManagedServer[]> = computed(() => {
        return servers.value.filter((s) => s.type === "dns");
    });

    /**
     * Add a new server to the managed list.
     *
     * The new server is inactive by default. If it is the first server added,
     * it is automatically set as active.
     *
     * @param type - "traditional" for LibreSpeed servers, "dns" for DNS-based servers.
     * @param config - The server configuration object matching the specified type.
     * @returns The generated unique ID for the newly added server entry.
     */
    function addServer(
        type: "traditional" | "dns",
        config: SpeedtestServer | DNSSpeedtestServer,
    ): string {
        const id = generateId();

        const entry: ManagedServer = {
            id,
            type,
            config,
            isActive: servers.value.length === 0, // First server is auto-active.
        };

        servers.value = [...servers.value, entry];
        return id;
    }

    /**
     * Remove a server from the managed list by its ID.
     *
     * If the removed server was the active one and other servers remain,
     * the first remaining server is automatically promoted to active.
     *
     * @param id - The unique ID of the server entry to remove.
     */
    function removeServer(id: string): void {
        const wasActive = servers.value.find((s) => s.id === id)?.isActive;
        servers.value = servers.value.filter((s) => s.id !== id);

        // If the removed server was active, promote the first remaining one.
        if (wasActive && servers.value.length > 0) {
            servers.value = servers.value.map((s, i) => ({
                ...s,
                isActive: i === 0,
            }));
        }
    }

    /**
     * Set the active server by ID. Deactivates all other servers.
     *
     * @param id - The unique ID of the server entry to activate.
     */
    function setActiveServer(id: string): void {
        servers.value = servers.value.map((s) => ({
            ...s,
            isActive: s.id === id,
        }));
    }

    /**
     * Fetch registered servers from the API, ping each, and auto-select
     * the one with the lowest latency.
     */
    async function fetchAndAutoSelect(): Promise<void> {
        try {
            const res = await fetch("/api/servers");
            if (!res.ok) return;

            const apiServers = await res.json() as Array<{
                serverId: string;
                name: string;
                host: string;
                port: number;
                endpoints: { garbage: string; empty: string; getIP: string };
                status: string;
            }>;

            if (apiServers.length === 0) return;

            // Replace all traditional servers with the registry entries
            // (removes the default static config in favor of the real registry)
            const existingDns = servers.value.filter((s) => s.type === "dns");
            servers.value = [...existingDns];

            for (const s of apiServers) {
                // For the local/primary server, use relative URLs so CORS isn't an issue
                const isLocal = s.host === location.hostname || s.host === "localhost";
                const baseUrl = isLocal
                    ? ""
                    : `${location.protocol}//${s.host}${s.port !== 443 && s.port !== 80 ? ":" + s.port : ""}`;

                const config: SpeedtestServer = {
                    name: s.name,
                    server: baseUrl + "/api/speedtest/",
                    dlURL: "garbage",
                    ulURL: "empty",
                    pingURL: "empty",
                    getIpURL: "getIP",
                };

                addServer("traditional", config);
            }

            // Ping all traditional servers and auto-select lowest latency
            const traditional = traditionalServers.value;
            if (traditional.length <= 1) return;

            const latencies = await Promise.all(
                traditional.map(async (s) => {
                    const config = s.config as SpeedtestServer;
                    const start = performance.now();
                    try {
                        await fetch(config.server + config.pingURL, { method: "HEAD", mode: "no-cors" });
                        return { id: s.id, latency: performance.now() - start };
                    } catch {
                        return { id: s.id, latency: Infinity };
                    }
                }),
            );

            latencies.sort((a, b) => a.latency - b.latency);
            if (latencies[0] && latencies[0].latency < Infinity) {
                setActiveServer(latencies[0].id);
            }
        } catch {
            // API unavailable — use default servers
        }
    }

    return {
        /** The full list of managed servers. */
        servers,
        /** The currently active server, or null. */
        activeServer,
        /** All traditional (LibreSpeed) servers. */
        traditionalServers,
        /** All DNS-based servers. */
        dnsServers,
        /** Add a server and return its generated ID. */
        addServer,
        /** Remove a server by ID. */
        removeServer,
        /** Set the active server by ID. */
        setActiveServer,
        /** Fetch servers from API and auto-select best one. */
        fetchAndAutoSelect,
    };
}
