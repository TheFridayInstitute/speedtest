<template>
    <div class="glass rounded-xl p-4 space-y-3">
        <h3 class="text-lg font-semibold">Filters</h3>

        <label class="block">
            <span class="text-base text-muted-foreground">From</span>
            <input
                type="date"
                class="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-lg"
                :value="filters.dateFrom"
                @input="update('dateFrom', ($event.target as HTMLInputElement).value)"
            />
        </label>

        <label class="block">
            <span class="text-base text-muted-foreground">To</span>
            <input
                type="date"
                class="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-lg"
                :value="filters.dateTo"
                @input="update('dateTo', ($event.target as HTMLInputElement).value)"
            />
        </label>

        <label class="block">
            <span class="text-base text-muted-foreground">Test Type</span>
            <select
                class="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-lg"
                :value="filters.testType"
                @change="update('testType', ($event.target as HTMLSelectElement).value)"
            >
                <option value="">All</option>
                <option value="traditional">Traditional</option>
                <option value="dns">DNS</option>
            </select>
        </label>

        <label class="block">
            <span class="text-base text-muted-foreground">PSU ID</span>
            <input
                type="text"
                class="mt-1 block w-full rounded-md border border-input bg-background px-2 py-1.5 text-lg"
                placeholder="e.g., 920"
                :value="filters.psuId"
                @input="update('psuId', ($event.target as HTMLInputElement).value)"
            />
        </label>

        <button
            class="w-full rounded-md bg-muted px-3 py-1.5 text-base font-medium hover:bg-muted/80 transition-colors"
            @click="$emit('reset')"
        >
            Clear Filters
        </button>
    </div>
</template>

<script setup lang="ts">
import type { DashboardFilters } from "@src/types/dashboard";

const props = defineProps<{ filters: DashboardFilters }>();

const emit = defineEmits<{
    update: [key: keyof DashboardFilters, value: string];
    reset: [];
}>();

function update(key: keyof DashboardFilters, value: string) {
    emit("update", key, value);
}
</script>
