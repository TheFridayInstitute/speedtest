<template>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card v-for="card in cards" :key="card.label" class="p-4">
            <p class="text-sm text-muted-foreground">{{ card.label }}</p>
            <p
                class="mt-1 text-3xl font-semibold tabular-nums"
                :style="card.color ? { color: card.color } : {}"
            >
                {{ card.value }}
            </p>
            <p v-if="card.unit" class="text-sm text-muted-foreground">{{ card.unit }}</p>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Card } from "@mkbabb/glass-ui";
import type { DashboardStats } from "@src/types/dashboard";
import { CHART_COLORS } from "./charts/chartMetrics";

const props = defineProps<{ stats: DashboardStats | null }>();

const cards = computed(() => {
    const s = props.stats;
    if (!s) return [];
    return [
        { label: "Total Tests", value: s.totalResults.toLocaleString(), unit: "", color: "" },
        { label: "Avg Download", value: Math.round(s.averages.download), unit: "Mbps", color: CHART_COLORS.download },
        { label: "Avg Upload", value: Math.round(s.averages.upload), unit: "Mbps", color: CHART_COLORS.upload },
        { label: "Avg Ping", value: Math.round(s.averages.ping), unit: "ms", color: CHART_COLORS.ping },
    ];
});
</script>
