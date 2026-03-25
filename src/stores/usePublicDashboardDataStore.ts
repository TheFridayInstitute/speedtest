import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDashboardFilterStore } from "./useDashboardFilterStore";
import { useDebounceFn } from "@vueuse/core";

export interface HexAggregation {
    h3Index: string;
    count: number;
    avg: number;
    min: number;
    max: number;
}

export interface TimeSeriesBucket {
    timestamp: string;
    download: { avg: number; count: number };
    upload: { avg: number; count: number };
    ping: { avg: number; count: number };
    jitter: { avg: number; count: number };
}

export interface DistributionData {
    histogram: { min: number; max: number; count: number }[];
    boxPlot: { p10: number; p25: number; median: number; p75: number; p90: number; mean: number };
}

export interface DashboardSummary {
    totalResults: number;
    avgDownload: number;
    avgUpload: number;
    avgPing: number;
    avgJitter: number;
}

export const usePublicDashboardDataStore = defineStore("publicDashboardData", () => {
    const filterStore = useDashboardFilterStore();

    // ── State ─────────────────────────────────────────────────────────
    const hexAggregations = ref<HexAggregation[]>([]);
    const timeSeries = ref<TimeSeriesBucket[]>([]);
    const distribution = ref<DistributionData | null>(null);
    const summary = ref<DashboardSummary | null>(null);

    const hexResolution = ref(5);
    const isLoadingHex = ref(false);
    const isLoadingTimeSeries = ref(false);
    const isLoadingDistribution = ref(false);
    const isLoadingSummary = ref(false);

    const isLoading = ref(false);

    // ── Fetchers ─────────────────────────────────────────────────────

    async function fetchHexMap() {
        isLoadingHex.value = true;
        try {
            const params = new URLSearchParams(filterStore.apiQueryParams);
            params.set("resolution", String(hexResolution.value));
            const res = await fetch(`/api/dashboard/hex-map?${params}`);
            if (res.ok) {
                hexAggregations.value = await res.json();
            }
        } catch (e) {
            console.warn("[dashboard] hex-map fetch failed:", e);
        } finally {
            isLoadingHex.value = false;
        }
    }

    async function fetchTimeSeries() {
        isLoadingTimeSeries.value = true;
        try {
            const params = new URLSearchParams(filterStore.apiQueryParams);
            const res = await fetch(`/api/dashboard/time-series?${params}`);
            if (res.ok) {
                const data = await res.json();
                timeSeries.value = data.buckets ?? [];
            }
        } catch (e) {
            console.warn("[dashboard] time-series fetch failed:", e);
        } finally {
            isLoadingTimeSeries.value = false;
        }
    }

    async function fetchDistribution() {
        isLoadingDistribution.value = true;
        try {
            const params = new URLSearchParams(filterStore.apiQueryParams);
            params.set("metric", filterStore.activeMetric);
            const res = await fetch(`/api/dashboard/distributions?${params}`);
            if (res.ok) {
                distribution.value = await res.json();
            }
        } catch (e) {
            console.warn("[dashboard] distributions fetch failed:", e);
        } finally {
            isLoadingDistribution.value = false;
        }
    }

    async function fetchSummary() {
        isLoadingSummary.value = true;
        try {
            const params = new URLSearchParams(filterStore.apiQueryParams);
            const res = await fetch(`/api/dashboard/summary?${params}`);
            if (res.ok) {
                summary.value = await res.json();
            }
        } catch (e) {
            console.warn("[dashboard] summary fetch failed:", e);
        } finally {
            isLoadingSummary.value = false;
        }
    }

    async function fetchAll() {
        isLoading.value = true;
        await Promise.allSettled([
            fetchHexMap(),
            fetchTimeSeries(),
            fetchDistribution(),
            fetchSummary(),
        ]);
        isLoading.value = false;
    }

    // ── Debounced watchers ───────────────────────────────────────────

    const debouncedFetchAll = useDebounceFn(fetchAll, 300);

    // Watch filter store changes and re-fetch
    watch(
        () => filterStore.apiQueryParams.toString(),
        () => {
            debouncedFetchAll();
        },
    );

    // Watch resolution changes for hex map only
    watch(hexResolution, () => {
        fetchHexMap();
    });

    return {
        // State
        hexAggregations,
        timeSeries,
        distribution,
        summary,
        hexResolution,

        // Loading
        isLoading,
        isLoadingHex,
        isLoadingTimeSeries,
        isLoadingDistribution,
        isLoadingSummary,

        // Actions
        fetchAll,
        fetchHexMap,
        fetchTimeSeries,
        fetchDistribution,
        fetchSummary,
    };
});
