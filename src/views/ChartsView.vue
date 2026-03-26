<template>
    <div class="w-full space-y-4 px-2">
        <!-- Overview: always visible -->
        <MetricGaugeCards :summary="summary" :loading="loading" />

        <!-- Chart sub-tabs -->
        <UnderlineTabs
            :options="chartTabs"
            v-model="activeChartTab"
            class="text-base"
        />

        <!-- Speed Over Time -->
        <template v-if="activeChartTab === 'timeseries'">
            <ExpandableContainer>
                <template #default="{ fullscreen }">
                    <Card class="h-full p-4">
                        <TimeSeriesChart :buckets="timeSeries" :loading="loading" />
                    </Card>
                </template>
            </ExpandableContainer>
        </template>

        <!-- Distribution -->
        <template v-else-if="activeChartTab === 'distribution'">
            <ExpandableContainer button-position="left">
                <template #default="{ fullscreen }">
                    <Card class="h-full p-4">
                        <div class="mb-3 flex items-center justify-end">
                            <MetricSelector
                                :model-value="distMetric"
                                :include-all="false"
                                @update:model-value="onDistMetricChange"
                            />
                        </div>
                        <DistributionChart
                            :data="distribution"
                            :metric="distMetric"
                            :loading="loading"
                        />
                    </Card>
                </template>
            </ExpandableContainer>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { Card, UnderlineTabs, ExpandableContainer } from "@mkbabb/glass-ui";
import { MetricGaugeCards, TimeSeriesChart, DistributionChart } from "@src/components/dashboard/charts";
import MetricSelector from "@src/components/dashboard/MetricSelector.vue";
import { useChartData } from "@src/components/dashboard/composables/useChartData";

const { filterStore, loading, summary, timeSeries, distribution, fetchDistribution, fetchAll } = useChartData();

const activeChartTab = ref("timeseries");
const distMetric = ref("download");

const chartTabs = [
    { label: "Speed Over Time", value: "timeseries" },
    { label: "Distribution", value: "distribution" },
];

function onDistMetricChange(metric: string) {
    distMetric.value = metric;
    fetchDistribution(metric);
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
