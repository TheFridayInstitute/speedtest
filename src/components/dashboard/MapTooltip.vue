<template>
    <div
        v-show="visible && data"
        class="glass-elevated pointer-events-none absolute z-50 rounded-lg px-3 py-2 text-sm"
        :style="{ left: `${x + 12}px`, top: `${y + 12}px` }"
    >
        <template v-if="data">
            <p class="font-semibold text-foreground">{{ metricLabel }}</p>
            <p class="tabular-nums text-foreground">
                Avg: <span class="font-medium">{{ formatValue(data.avg) }}</span>
                {{ unit }}
            </p>
            <p class="tabular-nums text-muted-foreground">
                Range: {{ formatValue(data.min) }} – {{ formatValue(data.max) }} {{ unit }}
            </p>
            <p class="text-muted-foreground">
                {{ data.count }} test{{ data.count !== 1 ? "s" : "" }}
            </p>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface MapTooltipData {
    metric: string;
    avg: number;
    count: number;
    min: number;
    max: number;
}

const props = defineProps<{
    visible: boolean;
    x: number;
    y: number;
    data: MapTooltipData | null;
}>();

const metricLabel = computed(() => {
    if (!props.data) return "";
    switch (props.data.metric) {
        case "download":
            return "Download Speed";
        case "upload":
            return "Upload Speed";
        case "ping":
            return "Latency (Ping)";
        case "jitter":
            return "Jitter";
        default:
            return props.data.metric;
    }
});

const unit = computed(() => {
    if (!props.data) return "";
    switch (props.data.metric) {
        case "download":
        case "upload":
            return "Mbps";
        case "ping":
        case "jitter":
            return "ms";
        default:
            return "";
    }
});

function formatValue(v: number): string {
    return v >= 100 ? Math.round(v).toString() : v.toFixed(1);
}
</script>
