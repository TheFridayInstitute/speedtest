import { ref } from "vue";
import type { Ref } from "vue";
import type { IPInfo, LookedUpIP } from "@src/types/dns";

/**
 * Composable that manages client IP address fetching and IP metadata lookups.
 *
 * On creation, automatically fetches the client's public IP, ISP/org info,
 * and entity lookup data from the Friday Institute API endpoints.
 */
export function useIPInfo() {
    /** The client's public IP address. */
    const clientIp: Ref<string> = ref("");

    /** ISP and geographic metadata for the client IP. */
    const ipInfo: Ref<IPInfo | null> = ref(null);

    /** Entity/organization lookup result for the client IP. */
    const lookedUpIp: Ref<LookedUpIP | null> = ref(null);

    /** Whether any of the IP info requests are currently in-flight. */
    const isLoading: Ref<boolean> = ref(false);

    /**
     * Fetch the client's public IP address.
     * Tries the Friday Institute endpoint first, falls back to ipify.
     * Returns the IP as a trimmed string.
     */
    async function getIP(): Promise<string> {
        try {
            const response = await fetch("https://ip.friday.institute");
            return (await response.text()).trim();
        } catch {
            const response = await fetch(
                "https://api.ipify.org?format=json",
            );
            const data = await response.json();
            return data.ip;
        }
    }

    /**
     * Fetch ISP/organization metadata for the given IP address.
     * Falls back to fetching the client IP first if none is provided.
     */
    async function getIPInfo(ip?: string): Promise<IPInfo> {
        ip = ip ?? (await getIP());
        const response = await fetch(
            `https://ip.friday.institute/ipinfo/${ip}`,
        );
        return await response.json();
    }

    /**
     * Fetch entity lookup data (organization name, ID) for the given IP address.
     * Falls back to fetching the client IP first if none is provided.
     */
    async function lookupIP(ip?: string): Promise<LookedUpIP> {
        ip = ip ?? (await getIP());
        const response = await fetch(
            `https://ip.friday.institute/lookup/${ip}`,
        );
        return await response.json();
    }

    /**
     * Refresh all IP-related data: fetch client IP, then ISP info and entity lookup
     * in parallel. Sets isLoading during the entire operation.
     */
    async function refresh(): Promise<void> {
        isLoading.value = true;

        try {
            const ip = await getIP();
            clientIp.value = ip;

            // Fetch IP info and lookup in parallel since they are independent.
            const results = await Promise.allSettled([
                getIPInfo(ip),
                lookupIP(ip),
            ]);

            if (results[0].status === "fulfilled") {
                ipInfo.value = results[0].value;
            } else {
                console.error("Failed to fetch IP info:", results[0].reason);
            }

            if (results[1].status === "fulfilled") {
                lookedUpIp.value = results[1].value;
            } else {
                console.error("Failed to lookup IP:", results[1].reason);
            }
        } catch (error) {
            console.error("Failed to fetch client IP:", error);
        } finally {
            isLoading.value = false;
        }
    }

    // Auto-fetch on creation.
    refresh();

    return {
        /** The client's public IP address. */
        clientIp,
        /** ISP and geographic metadata for the client IP. */
        ipInfo,
        /** Entity/organization lookup result for the client IP. */
        lookedUpIp,
        /** Whether any IP info requests are currently in-flight. */
        isLoading,
        /** Re-fetch all IP information from scratch. */
        refresh,
    };
}
