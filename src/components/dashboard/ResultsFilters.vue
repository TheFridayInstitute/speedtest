<template>
    <Card class="sticky top-16 space-y-3 p-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Filters</h3>
            <Button
                v-if="filterStore.hasActiveFilters"
                variant="ghost"
                size="sm"
                class="h-6 px-2 text-xs text-muted-foreground"
                @click="filterStore.reset()"
            >
                Clear
            </Button>
        </div>

        <Separator />

        <!-- Time Range section -->
        <div class="space-y-1.5">
            <h4 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Time Range
            </h4>
            <div>
                <Label class="text-sm text-muted-foreground">From</Label>
                <Input
                    type="date"
                    class="mt-0.5"
                    :model-value="filterStore.dateFrom ?? ''"
                    @update:model-value="filterStore.dateFrom = $event || null"
                />
            </div>
            <div>
                <Label class="text-sm text-muted-foreground">To</Label>
                <Input
                    type="date"
                    class="mt-0.5"
                    :model-value="filterStore.dateTo ?? ''"
                    @update:model-value="filterStore.dateTo = $event || null"
                />
            </div>
            <div>
                <Label class="text-sm text-muted-foreground">Interval</Label>
                <Select
                    :model-value="filterStore.timeInterval"
                    @update:model-value="filterStore.timeInterval = $event"
                >
                    <SelectTrigger class="mt-0.5">
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
        </div>

        <Separator />

        <!-- Test section -->
        <div class="space-y-1.5">
            <h4 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Test
            </h4>
            <div>
                <Label class="text-sm text-muted-foreground">Type</Label>
                <Select
                    :model-value="filterStore.testType ?? 'all'"
                    @update:model-value="(v: string) => (filterStore.testType = v === 'all' ? null : v)"
                >
                    <SelectTrigger class="mt-0.5">
                        <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="traditional">Traditional</SelectItem>
                        <SelectItem value="dns">DNS</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <Separator />

        <!-- Entity section -->
        <div class="space-y-1.5">
            <h4 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Entity
            </h4>
            <div>
                <Label class="text-sm text-muted-foreground">PSU ID</Label>
                <Input
                    type="text"
                    class="mt-0.5"
                    placeholder="e.g., 920"
                    :model-value="filterStore.psuId ?? ''"
                    @update:model-value="filterStore.psuId = $event || null"
                />
            </div>
            <div>
                <Label class="text-sm text-muted-foreground">Provider</Label>
                <Input
                    type="text"
                    class="mt-0.5"
                    placeholder="e.g., Comcast"
                    :model-value="filterStore.provider ?? ''"
                    @update:model-value="filterStore.provider = $event || null"
                />
            </div>
            <div>
                <Label class="text-sm text-muted-foreground">Entity ID</Label>
                <Input
                    type="text"
                    class="mt-0.5"
                    placeholder="e.g., 12345"
                    :model-value="filterStore.entityId ?? ''"
                    @update:model-value="filterStore.entityId = $event || null"
                />
            </div>
        </div>

        <Separator />

        <!-- Metric section -->
        <div class="space-y-1.5">
            <h4 class="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Metric
            </h4>
            <BouncyTabs
                :options="metricOptions"
                :model-value="filterStore.activeMetric"
                @update:model-value="filterStore.activeMetric = $event"
            />
        </div>
    </Card>
</template>

<script setup lang="ts">
import {
    BouncyTabs,
    Card,
    Button,
    Input,
    Label,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Separator,
} from "@mkbabb/glass-ui";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";

const filterStore = useDashboardFilterStore();

const metricOptions = [
    { label: "DL", value: "download" },
    { label: "UL", value: "upload" },
    { label: "Ping", value: "ping" },
    { label: "Jitter", value: "jitter" },
];
</script>
