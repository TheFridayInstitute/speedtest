<template>
    <div class="space-y-4">
        <!-- Compact filter row -->
        <div class="flex flex-wrap items-center gap-2 sm:gap-3 text-sm">
            <Input
                type="date"
                class="w-36"
                :model-value="filterStore.dateFrom ?? ''"
                @update:model-value="filterStore.dateFrom = String($event) || null"
            />
            <span class="text-muted-foreground">to</span>
            <Input
                type="date"
                class="w-36"
                :model-value="filterStore.dateTo ?? ''"
                @update:model-value="filterStore.dateTo = String($event) || null"
            />
            <Select
                :model-value="filterStore.testType ?? 'all'"
                @update:model-value="(v: any) => filterStore.testType = v === 'all' ? null : v"
            >
                <SelectTrigger class="w-32">
                    <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="traditional">Traditional</SelectItem>
                    <SelectItem value="dns">DNS</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <!-- Summary stats -->
        <StatsCards :stats="statsComposable.stats.value" />

        <!-- Embedded mini chart (30-day trend) -->
        <Card class="p-4">
            <h3 class="mb-2 text-sm font-medium text-muted-foreground">30-Day Trend</h3>
            <div class="h-48 sm:h-56 w-full">
                <TimeSeriesChart :buckets="timeSeries" :loading="loading" :compact="true" />
            </div>
        </Card>

        <!-- Recent results (compact preview, links to Data tab) -->
        <Card class="overflow-hidden">
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
                <h3 class="text-base font-semibold">Recent Tests</h3>
                <Button
                    variant="ghost"
                    size="sm"
                    class="text-sm text-muted-foreground"
                    @click="router.push({ name: 'admin-data' })"
                >
                    View all
                </Button>
            </div>
            <ResultsTable
                :rows="resultsComposable.rows.value.slice(0, 10)"
                :total="resultsComposable.total.value"
                :page="1"
                :page-size="10"
                :is-loading="resultsComposable.isLoading.value"
                @export="onExport"
                @select="() => {}"
            />
        </Card>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { Button, Card, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@mkbabb/glass-ui";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";
import StatsCards from "@src/components/dashboard/StatsCards.vue";
import ResultsTable from "@src/components/dashboard/ResultsTable.vue";
import { TimeSeriesChart } from "@src/components/dashboard/charts";
import { useDashboardResults } from "@src/components/dashboard/composables/useDashboardResults";
import { useDashboardStats } from "@src/components/dashboard/composables/useDashboardStats";
import { useChartData } from "@src/components/dashboard/composables/useChartData";

const router = useRouter();
const filterStore = useDashboardFilterStore();
const statsComposable = useDashboardStats();
const resultsComposable = useDashboardResults();

const { timeSeries, fetchTimeSeries } = useChartData();
const loading = ref(false);

async function loadTimeSeries() {
    loading.value = true;
    try {
        await fetchTimeSeries();
    } finally {
        loading.value = false;
    }
}

onMounted(() => {
    statsComposable.fetch();
    loadTimeSeries();
});

function onExport() {
    window.open("/api/admin/results/export", "_blank");
}
</script>
