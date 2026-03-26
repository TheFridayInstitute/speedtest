<template>
    <div class="w-full space-y-4 px-2">
        <MetricGaugeCards :summary="summary" :loading="loading" />

        <Card class="p-4">
            <div class="mb-3 flex items-center justify-between">
                <UnderlineTabs
                    :options="chartTabs"
                    :model-value="activeChartTab"
                    class="text-base"
                    @update:model-value="activeChartTab = $event"
                />
                <MetricSelector
                    v-if="activeChartTab === 'distribution'"
                    :model-value="distMetric"
                    :include-all="false"
                    @update:model-value="onDistMetricChange"
                />
            </div>

            <TimeSeriesChart
                v-if="activeChartTab === 'timeseries'"
                :buckets="timeSeries"
                :loading="loading"
            />

            <DistributionChart
                v-else-if="activeChartTab === 'distribution'"
                :data="distribution"
                :metric="distMetric"
                :loading="loading"
            />
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { Card, UnderlineTabs } from "@mkbabb/glass-ui";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";
import { MetricGaugeCards, TimeSeriesChart, DistributionChart } from "@src/components/dashboard/charts";
import MetricSelector from "@src/components/dashboard/MetricSelector.vue";
import type { DashboardSummary, TimeSeriesBucket, DistributionData } from "@src/components/dashboard/charts";

const filterStore = useDashboardFilterStore();

const activeChartTab = ref("timeseries");
const distMetric = ref("download");

const chartTabs = [
    { label: "Speed Over Time", value: "timeseries" },
    { label: "Distribution", value: "distribution" },
];

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

async function fetchDistribution(): Promise<void> {
    try {
        const metric = distMetric.value === "all" ? "download" : distMetric.value;
        const baseParams = new URLSearchParams(filterStore.apiQueryParams);
        baseParams.set("metric", metric);
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

function onDistMetricChange(metric: string) {
    distMetric.value = metric;
    fetchDistribution();
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
    () => filterStore.apiQueryParams.toString(),
    () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => fetchAll(), 300);
    },
);

onMounted(() => {
    fetchAll();
});

onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
});
</script>
