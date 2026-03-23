import { ref, computed } from "vue";
import type { Ref, ComputedRef } from "vue";
import type {
    SpeedtestResult,
    DNSSpeedtestResultData,
    AggregatedResult,
} from "@src/types/server";

/**
 * Compute the median of a numeric array.
 * Returns 0 for empty arrays. Does not mutate the input.
 *
 * @param arr - Array of numbers to compute the median of.
 * @returns The median value.
 */
function median(arr: number[]): number {
    if (arr.length === 0) {
        return 0;
    }

    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
}

/**
 * Compute the arithmetic mean of a numeric array.
 * Returns 0 for empty arrays.
 *
 * @param arr - Array of numbers to average.
 * @returns The arithmetic mean.
 */
function average(arr: number[]): number {
    if (arr.length === 0) {
        return 0;
    }
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/**
 * Type guard: returns true if the result is a traditional SpeedtestResult
 * (has upload, ping, and jitter fields).
 */
function isTraditionalResult(
    result: SpeedtestResult | DNSSpeedtestResultData,
): result is SpeedtestResult {
    return (
        "upload" in result && "ping" in result && "jitter" in result
    );
}

/**
 * Composable that aggregates speedtest results across multiple servers
 * and test runs, computing median and average statistics.
 *
 * Accepts results from both traditional (LibreSpeed) and DNS-based tests.
 * DNS results contribute only download speeds (they have no upload or ping data).
 */
export function useResultAggregator() {
    /** The complete list of all collected test results. */
    const allResults: Ref<(SpeedtestResult | DNSSpeedtestResultData)[]> = ref(
        [],
    );

    /**
     * Aggregated statistics computed from all collected results.
     *
     * - Download values include both traditional and DNS results.
     * - Upload and ping values include only traditional results
     *   (DNS tests do not measure these).
     * - perServer provides a per-server breakdown with the original result objects.
     */
    const aggregated: ComputedRef<AggregatedResult> = computed(() => {
        const results = allResults.value;

        // Collect download speeds from all result types.
        const downloads: number[] = [];
        // Upload and ping only come from traditional results.
        const uploads: number[] = [];
        const pings: number[] = [];

        const perServer: AggregatedResult["perServer"] = [];

        for (const result of results) {
            if (isTraditionalResult(result)) {
                downloads.push(result.download);
                uploads.push(result.upload);
                pings.push(result.ping);

                perServer.push({
                    serverId: result.serverId,
                    serverName: result.serverName,
                    result,
                });
            } else {
                // DNS result — only has download speed.
                if (
                    result.speedtest_dl_speed != null &&
                    Number.isFinite(result.speedtest_dl_speed)
                ) {
                    downloads.push(result.speedtest_dl_speed);
                }

                perServer.push({
                    serverId: result.serverId,
                    serverName: result.serverName,
                    result,
                });
            }
        }

        return {
            medianDownload: median(downloads),
            medianUpload: median(uploads),
            medianPing: median(pings),
            averageDownload: average(downloads),
            averageUpload: average(uploads),
            averagePing: average(pings),
            perServer,
        };
    });

    /**
     * Add a new result to the aggregation pool.
     *
     * @param result - A traditional SpeedtestResult or DNS result to include.
     */
    function addResult(
        result: SpeedtestResult | DNSSpeedtestResultData,
    ): void {
        allResults.value = [...allResults.value, result];
    }

    /**
     * Clear all collected results, resetting the aggregation to empty.
     */
    function clearResults(): void {
        allResults.value = [];
    }

    return {
        /** All collected test results. */
        allResults,
        /** Computed aggregate statistics (median/average) across all results. */
        aggregated,
        /** Add a result to the collection. */
        addResult,
        /** Clear all results. */
        clearResults,
    };
}

// Also export the median helper for external use (e.g., testing).
export { median };
