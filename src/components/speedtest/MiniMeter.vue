<template>
    <div class="flex items-center gap-2 rounded-full bg-card/70 backdrop-blur-md border border-border/40 px-3 py-1 shadow-sm text-sm">
        <component
            v-if="status.isRunning && status.currentPhase && phaseIconMap[status.currentPhase]"
            :is="phaseIconMap[status.currentPhase]"
            class="w-3.5 h-3.5 text-muted-foreground shrink-0"
            :class="{ 'animate-spin': status.currentPhase === 'started' }"
        />
        <template v-for="metric in metrics" :key="metric.id">
            <div v-if="metric.show" class="flex items-baseline gap-0.5">
                <span class="font-mono font-semibold tabular-nums" :style="{ color: metric.color }">{{ metric.amount }}</span>
                <span class="text-xs text-muted-foreground">{{ metric.unit }}</span>
            </div>
        </template>
        <div
            v-if="status.isRunning"
            class="h-1.5 w-1.5 rounded-full animate-pulse shrink-0"
            style="background: var(--th-accent-opaque)"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Download, Upload, Activity, Loader } from "lucide-vue-next";
import { CHART_COLORS } from "@src/components/dashboard/charts/chartMetrics";
import { TestState } from "@src/types/speedtest";
import type { SpeedtestStatus } from "@src/types/speedtest";

const phaseIconMap: Record<string, any> = {
    download: Download,
    upload: Upload,
    ping: Activity,
    started: Loader,
};

const props = defineProps<{
    status: SpeedtestStatus;
}>();

function isActiveOrBeyond(metricId: string): boolean {
    const s = props.status.testStates?.[metricId];
    return s === TestState.active || s === TestState.finished || s === TestState.drawFinished;
}

const metrics = computed(() => {
    const s = props.status;
    return [
        { id: "ping", amount: s.pingResult?.amount ?? "", unit: s.pingResult?.unit ?? "ms", color: CHART_COLORS.ping, show: isActiveOrBeyond("ping") && s.pingResult?.amount },
        { id: "download", amount: s.downloadResult?.amount ?? "", unit: s.downloadResult?.unit ?? "Mbps", color: CHART_COLORS.download, show: isActiveOrBeyond("download") && s.downloadResult?.amount },
        { id: "upload", amount: s.uploadResult?.amount ?? "", unit: s.uploadResult?.unit ?? "Mbps", color: CHART_COLORS.upload, show: isActiveOrBeyond("upload") && s.uploadResult?.amount },
    ];
});
</script>
