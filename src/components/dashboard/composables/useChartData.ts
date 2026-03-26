import { ref } from "vue";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";
import type { DashboardSummary, TimeSeriesBucket, DistributionData } from "../charts";

export function useChartData() {
    const filterStore = useDashboardFilterStore();
    const loading = ref(false);
    const summary = ref<DashboardSummary | null>(null);
    const timeSeries = ref<TimeSeriesBucket[]>([]);
    const distribution = ref<DistributionData | null>(null);

    async function fetchSummary(): Promise<void> {
        try {
            const params = filterStore.apiQueryParams.toString();
            const url = `/api/dashboard/summary${params ? `?${params}` : ""}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            summary.value = await resp.json();
        } catch {
            summary.value = null;
        }
    }

    async function fetchTimeSeries(): Promise<void> {
        try {
            const params = filterStore.apiQueryParams.toString();
            const url = `/api/dashboard/time-series${params ? `?${params}` : ""}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            timeSeries.value = Array.isArray(data) ? data : data.buckets ?? [];
        } catch {
            timeSeries.value = [];
        }
    }

    async function fetchDistribution(metric?: string): Promise<void> {
        try {
            const m = metric && metric !== "all" ? metric : "download";
            const baseParams = new URLSearchParams(filterStore.apiQueryParams);
            baseParams.set("metric", m);
            const url = `/api/dashboard/distributions?${baseParams.toString()}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            distribution.value = await resp.json();
        } catch {
            distribution.value = null;
        }
    }

    async function fetchAll(): Promise<void> {
        loading.value = true;
        try {
            await Promise.all([fetchSummary(), fetchTimeSeries(), fetchDistribution()]);
        } finally {
            loading.value = false;
        }
    }

    return {
        filterStore,
        loading,
        summary,
        timeSeries,
        distribution,
        fetchSummary,
        fetchTimeSeries,
        fetchDistribution,
        fetchAll,
    };
}
