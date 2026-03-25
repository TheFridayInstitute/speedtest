<template>
    <Card class="space-y-3 p-4">
        <h3 class="text-lg font-semibold">Filters</h3>

        <!-- Date range -->
        <div>
            <Label class="text-base text-muted-foreground">From</Label>
            <Input
                type="date"
                class="mt-1 text-lg"
                :model-value="filterStore.dateFrom ?? ''"
                @update:model-value="filterStore.dateFrom = $event || null"
            />
        </div>
        <div>
            <Label class="text-base text-muted-foreground">To</Label>
            <Input
                type="date"
                class="mt-1 text-lg"
                :model-value="filterStore.dateTo ?? ''"
                @update:model-value="filterStore.dateTo = $event || null"
            />
        </div>

        <!-- Time interval -->
        <div>
            <Label class="text-base text-muted-foreground">Interval</Label>
            <Select
                :model-value="filterStore.timeInterval"
                @update:model-value="(v: any) => filterStore.timeInterval = v"
            >
                <SelectTrigger class="mt-1 text-lg">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <!-- Test type -->
        <div>
            <Label class="text-base text-muted-foreground">Test Type</Label>
            <Select
                :model-value="filterStore.testType ?? 'all'"
                @update:model-value="(v: any) => filterStore.testType = v === 'all' ? null : v"
            >
                <SelectTrigger class="mt-1 text-lg">
                    <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="traditional">Traditional</SelectItem>
                    <SelectItem value="dns">DNS</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <!-- Provider -->
        <div>
            <Label class="text-base text-muted-foreground">Provider</Label>
            <Input
                type="text"
                class="mt-1 text-lg"
                placeholder="e.g., Spectrum"
                :model-value="filterStore.provider ?? ''"
                @update:model-value="filterStore.provider = String($event) || null"
            />
        </div>

        <!-- Entity ID -->
        <div>
            <Label class="text-base text-muted-foreground">Entity ID</Label>
            <Input
                type="text"
                class="mt-1 text-lg"
                placeholder="e.g., 920"
                :model-value="filterStore.entityId ?? ''"
                @update:model-value="filterStore.entityId = String($event) || null"
            />
        </div>

        <!-- Active metric -->
        <div>
            <Label class="text-base text-muted-foreground">Metric</Label>
            <div class="mt-1 flex gap-1">
                <button
                    v-for="m in metrics"
                    :key="m.value"
                    class="flex-1 rounded-lg px-2 py-1.5 text-base font-medium transition-colors"
                    :class="filterStore.activeMetric === m.value
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'"
                    @click="filterStore.activeMetric = m.value"
                >
                    {{ m.label }}
                </button>
            </div>
        </div>

        <!-- Active H3 cells (chips) -->
        <div v-if="filterStore.selectedH3Cells.length > 0">
            <Label class="text-base text-muted-foreground">Selected Areas</Label>
            <div class="mt-1 flex flex-wrap gap-1">
                <span
                    v-for="cell in filterStore.selectedH3Cells"
                    :key="cell"
                    class="glass inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm"
                >
                    {{ cell.slice(0, 8) }}…
                    <button
                        class="ml-0.5 text-muted-foreground hover:text-foreground"
                        @click="filterStore.removeFromMapSelection(cell)"
                    >
                        ×
                    </button>
                </span>
            </div>
        </div>

        <!-- Brushed time range (chip) -->
        <div v-if="filterStore.brushedTimeRange">
            <Label class="text-base text-muted-foreground">Time Selection</Label>
            <span class="glass mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm">
                {{ formatDate(filterStore.brushedTimeRange[0]) }} – {{ formatDate(filterStore.brushedTimeRange[1]) }}
                <button
                    class="ml-0.5 text-muted-foreground hover:text-foreground"
                    @click="filterStore.setFromChartBrush(null)"
                >
                    ×
                </button>
            </span>
        </div>

        <!-- Clear all -->
        <Button
            v-if="filterStore.hasActiveFilters"
            variant="ghost"
            class="w-full"
            @click="filterStore.reset()"
        >
            Clear All Filters
        </Button>
    </Card>
</template>

<script setup lang="ts">
import { useDashboardFilterStore, type DashboardMetric } from "@src/stores/useDashboardFilterStore";
import {
    Button, Card, Input, Label,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@mkbabb/glass-ui";

const filterStore = useDashboardFilterStore();

const metrics: { value: DashboardMetric; label: string }[] = [
    { value: "download", label: "DL" },
    { value: "upload", label: "UL" },
    { value: "ping", label: "Ping" },
    { value: "jitter", label: "Jitter" },
];

function formatDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
        return iso;
    }
}
</script>
