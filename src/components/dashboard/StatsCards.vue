<template>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="card in cards" :key="card.label" class="glass rounded-xl p-4">
            <p class="text-base text-muted-foreground">{{ card.label }}</p>
            <p class="mt-1 text-3xl font-semibold tabular-nums">
                {{ card.value }}
            </p>
            <p v-if="card.unit" class="text-base text-muted-foreground">{{ card.unit }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardStats } from "@src/types/dashboard";

const props = defineProps<{ stats: DashboardStats | null }>();

const cards = computed(() => {
    const s = props.stats;
    if (!s) return [];
    return [
        { label: "Total Tests", value: s.totalResults, unit: "" },
        { label: "Avg Download", value: s.averages.download, unit: "Mbps" },
        { label: "Avg Upload", value: s.averages.upload, unit: "Mbps" },
        { label: "Avg Ping", value: s.averages.ping, unit: "ms" },
    ];
});
</script>
