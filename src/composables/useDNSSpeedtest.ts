import { ref, watch } from "vue";
import type { Ref } from "vue";
import type {
    DNSSpeedtestServer,
    DNSSpeedtestResultData,
} from "@src/types/server";
import { sleep } from "@utils/timing";
import { toast } from "vue-sonner";

/** Maximum number of polling attempts before giving up on results. */
const MAX_ATTEMPTS = 20;

/** Delay in milliseconds between polling attempts. */
const POLL_INTERVAL_MS = 2000;

/**
 * Composable that manages DNS-based speedtest execution and result polling.
 *
 * Unlike the traditional LibreSpeed test, the DNS speedtest works by issuing
 * a fetch to a specially crafted DNS subdomain. The server records the DNS
 * query timing on the backend, and results are polled from a separate API
 * endpoint after the request completes.
 *
 * @param server - The DNS speedtest server configuration. Determines the
 *                 domain used for the test request and the endpoint for
 *                 polling results.
 */
export function useDNSSpeedtest(server: DNSSpeedtestServer) {
    // ── Reactive state ────────────────────────────────────────────────

    /** Number of bytes to request in the DNS test (encoded in the subdomain). */
    const byteAmount: Ref<number> = ref(60000);

    /** Unique identifier for the current test run. Set when a test starts. */
    const clientUID: Ref<string> = ref("");

    /** The result data from the most recent completed DNS speedtest. */
    const result: Ref<DNSSpeedtestResultData | undefined> = ref(undefined);

    /** Whether a DNS speedtest request is currently in-flight. */
    const isRunning: Ref<boolean> = ref(false);

    /** Whether we are actively polling the server for results. */
    const isPolling: Ref<boolean> = ref(false);

    /** Human-readable error message if the test or polling fails. */
    const error: Ref<string | null> = ref(null);

    // ── Internal helpers ──────────────────────────────────────────────

    /**
     * Poll the results endpoint until data is available or max attempts are exhausted.
     * Uses recursive retry with a fixed delay between attempts.
     *
     * @param uid - The unique test identifier to query for.
     * @param srv - The DNS speedtest server whose resultsEndpoint to query.
     * @param attempts - Current attempt count (used internally for recursion).
     * @returns The result data when available.
     * @throws Error if max attempts are exceeded without receiving complete data.
     */
    async function pollResults(
        uid: string,
        srv: DNSSpeedtestServer,
        attempts: number = 0,
    ): Promise<DNSSpeedtestResultData> {
        const url = `${srv.resultsEndpoint}/dns-results/speedtest/uid/${uid}`;

        let data: DNSSpeedtestResultData | null = null;

        try {
            toast.info("Fetching DNS speedtest results", {
                description: `For URL: ${url}`,
            });

            const response = await fetch(url);
            const json = await response.json();

            // The server may return data without a speed value while processing.
            if (json?.speedtest_dl_speed != null) {
                data = json as DNSSpeedtestResultData;
            }
        } catch (e) {
            console.error("Error fetching DNS speedtest results:", e);
        }

        // If data is not ready (null or pending status), retry after a delay.
        if (!data || data?.status === "pending") {
            if (attempts < MAX_ATTEMPTS) {
                await sleep(POLL_INTERVAL_MS);
                return pollResults(uid, srv, attempts + 1);
            } else {
                throw new Error(
                    `Max polling attempts (${MAX_ATTEMPTS}) reached for UID: ${uid}`,
                );
            }
        }

        return data;
    }

    /**
     * Fetch raw PCAP (packet capture) data for a completed DNS speedtest run.
     *
     * @param uid - The unique test identifier whose PCAP data to retrieve.
     * @returns The parsed PCAP JSON data, or undefined on failure.
     */
    async function getPcapData(
        uid: string,
    ): Promise<Record<string, unknown> | undefined> {
        if (!uid) {
            return undefined;
        }

        const url = `${server.resultsEndpoint}/dns-results/pcap/uid/${uid}`;

        try {
            const response = await fetch(url);
            return await response.json();
        } catch (e) {
            console.error("Error fetching DNS PCAP data:", e);
            return undefined;
        }
    }

    /**
     * Format a speed value (in Mbps) to a human-readable string.
     * Values >= 1000 Mbps are converted to Gbps with 3 significant digits.
     *
     * @param speed - Speed in Mbps.
     * @returns Formatted string, e.g. "250 Mbps" or "1.23 Gbps".
     */
    function getFormattedSpeed(speed: number): string {
        if (speed < 1000) {
            return `${speed} Mbps`;
        } else {
            return `${(speed / 1000).toPrecision(3)} Gbps`;
        }
    }

    // ── Lifecycle methods ─────────────────────────────────────────────

    /**
     * Start a DNS speedtest against the configured server.
     *
     * Generates a unique test ID, issues a fetch to the DNS endpoint
     * (which triggers server-side DNS query measurement), then polls
     * for results. The result ref is cleared at the start to show
     * a loading state in the UI.
     */
    async function start(): Promise<void> {
        if (isRunning.value) {
            return;
        }

        error.value = null;
        result.value = undefined;
        isRunning.value = true;

        try {
            // Generate a unique test identifier.
            const uid = Math.random().toString(36).substring(2);
            clientUID.value = uid;

            // Build the test URL: {bytes}_{uid}.{dnsEndpoint}
            const url = `https://${byteAmount.value}_${uid}.${server.dnsEndpoint}`;

            toast.info("Starting DNS speedtest...", {
                description: `For URL: ${url}`,
            });

            // Issue the DNS test request. This will almost certainly fail at the
            // HTTP level (the DNS server does not serve real content), but the
            // DNS query itself is what the server measures.
            try {
                await fetch(url, {
                    method: "GET",
                    mode: "cors",
                    cache: "no-cache",
                    credentials: "same-origin",
                    keepalive: false,
                    redirect: "error",
                    signal: AbortSignal.timeout(10),
                });
            } catch (_fetchError) {
                // Expected: the fetch will fail because the DNS endpoint is not
                // a real HTTP server. The server-side measurement is triggered
                // by the DNS query alone.
                console.log(
                    "DNS test fetch completed (expected failure):",
                    _fetchError,
                );
            }

            // Now poll for results. The watcher below also handles this,
            // but we trigger it explicitly for clarity.
            isPolling.value = true;

            try {
                const resultData = await pollResults(uid, server);
                result.value = resultData;
            } catch (pollError) {
                const message =
                    pollError instanceof Error
                        ? pollError.message
                        : String(pollError);
                error.value = message;
                toast.error("DNS speedtest failed", {
                    description: message,
                });
            } finally {
                isPolling.value = false;
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e);
            error.value = message;
            console.error("DNS speedtest error:", e);
        } finally {
            isRunning.value = false;
        }
    }

    // Watch for UID changes (e.g., from external triggers) and auto-poll.
    watch(clientUID, async (uid) => {
        if (uid && !isPolling.value && result.value === undefined) {
            isPolling.value = true;
            try {
                result.value = await pollResults(uid, server);
            } catch (e) {
                const message = e instanceof Error ? e.message : String(e);
                error.value = message;
            } finally {
                isPolling.value = false;
            }
        }
    });

    return {
        /** Number of bytes to request in the DNS test. */
        byteAmount,
        /** Unique identifier for the current/last test run. */
        clientUID,
        /** Result data from the most recent DNS speedtest. */
        result,
        /** Whether the DNS speedtest request is in-flight. */
        isRunning,
        /** Whether result polling is in progress. */
        isPolling,
        /** Error message if the test or polling failed. */
        error,

        /** Start a new DNS speedtest. */
        start,
        /** Fetch PCAP data for a given test UID. */
        getPcapData,
        /** Format a speed value to a human-readable string. */
        getFormattedSpeed,
    };
}
