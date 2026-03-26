<template>
    <div class="flex items-center gap-1.5 rounded-full bg-card/70 backdrop-blur-md border border-border/40 px-2.5 py-1 shadow-sm">
        <div v-for="metric in metrics" :key="metric.id" class="flex flex-col items-center leading-none shrink-0">
            <span class="text-micro uppercase text-muted-foreground">{{ metric.label }}</span>
            <div class="flex items-baseline gap-0.5">
                <span
                    class="text-mono-small font-semibold tabular-nums"
                    :style="{ color: metric.amount ? metric.color : undefined }"
                    :class="{ 'text-muted-foreground/40': !metric.amount }"
                >{{ metric.amount || "\u2014" }}</span>
                <span class="text-micro text-muted-foreground">{{ metric.unit }}</span>
            </div>
        </div>
        <div
            v-if="status.isRunning"
            class="h-1.5 w-1.5 rounded-full animate-pulse shrink-0"
            style="background: var(--th-accent-opaque)"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { CHART_COLORS } from "@src/components/dashboard/charts/chartMetrics";
import type { SpeedtestStatus } from "@src/types/speedtest";

const props = defineProps<{
    status: SpeedtestStatus;
}>();

const metrics = computed(() => {
    const s = props.status;
    return [
        { id: "ping", label: "Ping", amount: s.pingResult?.amount ?? "", unit: s.pingResult?.unit ?? "ms", color: CHART_COLORS.ping },
        { id: "download", label: "DL", amount: s.downloadResult?.amount ?? "", unit: s.downloadResult?.unit ?? "Mbps", color: CHART_COLORS.download },
        { id: "upload", label: "UL", amount: s.uploadResult?.amount ?? "", unit: s.uploadResult?.unit ?? "Mbps", color: CHART_COLORS.upload },
    ];
});
</script>
