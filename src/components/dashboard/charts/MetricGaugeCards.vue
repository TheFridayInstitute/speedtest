<template>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4" :class="{ 'sm:grid-cols-5': showJitter }">
        <Card v-for="card in cards" :key="card.key" class="p-4">
            <p class="text-sm text-muted-foreground">{{ card.label }}</p>
            <p class="mt-1 text-3xl font-semibold tabular-nums" :style="{ color: card.color }">
                {{ card.displayValue }}
            </p>
            <p v-if="card.unit" class="text-sm text-muted-foreground">{{ card.unit }}</p>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { Card } from "@mkbabb/glass-ui";

// ── Types ─────────────────────────────────────────────────────────────

export interface DashboardSummary {
    totalResults: number;
    avgDownload: number;
    avgUpload: number;
    avgPing: number;
    avgJitter?: number;
}

interface CardConfig {
    key: string;
    label: string;
    unit: string;
    color: string;
    targetValue: number;
    decimals: number;
    isCounting: boolean;
}

// ── Props ─────────────────────────────────────────────────────────────

const props = withDefaults(
    defineProps<{
        summary: DashboardSummary | null;
        loading?: boolean;
    }>(),
    {
        loading: false,
    },
);

// ── Animation state ───────────────────────────────────────────────────

const showJitter = computed(() => props.summary?.avgJitter != null);

const animatedValues = ref<Record<string, number>>({
    totalResults: 0,
    avgDownload: 0,
    avgUpload: 0,
    avgPing: 0,
    avgJitter: 0,
});

let activeFrames: number[] = [];

function animateValue(key: string, from: number, to: number, duration: number = 800): void {
    const startTime = performance.now();
    const delta = to - from;

    function tick(now: number): void {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        animatedValues.value[key] = from + delta * eased;

        if (progress < 1) {
            const frame = requestAnimationFrame(tick);
            activeFrames.push(frame);
        }
    }

    const frame = requestAnimationFrame(tick);
    activeFrames.push(frame);
}

watch(
    () => props.summary,
    (newSummary) => {
        // Cancel any ongoing animations
        for (const frame of activeFrames) cancelAnimationFrame(frame);
        activeFrames = [];

        if (!newSummary) {
            animatedValues.value = {
                totalResults: 0,
                avgDownload: 0,
                avgUpload: 0,
                avgPing: 0,
                avgJitter: 0,
            };
            return;
        }

        const targets: Record<string, number> = {
            totalResults: newSummary.totalResults,
            avgDownload: newSummary.avgDownload,
            avgUpload: newSummary.avgUpload,
            avgPing: newSummary.avgPing,
            avgJitter: newSummary.avgJitter ?? 0,
        };

        for (const [key, target] of Object.entries(targets)) {
            const current = animatedValues.value[key] ?? 0;
            if (Math.abs(current - target) > 0.01) {
                animateValue(key, current, target);
            }
        }
    },
    { immediate: true },
);

onBeforeUnmount(() => {
    for (const frame of activeFrames) cancelAnimationFrame(frame);
    activeFrames = [];
});

// ── Card definitions ──────────────────────────────────────────────────

const cards = computed(() => {
    const s = props.summary;
    const av = animatedValues.value;

        // Read chart colors from CSS custom properties with hex fallbacks
    const root = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
    const colors = {
        download: root?.getPropertyValue("--chart-download").trim() || "#5B6BC0",
        upload: root?.getPropertyValue("--chart-upload").trim() || "#26A69A",
        ping: root?.getPropertyValue("--chart-ping").trim() || "#FFA726",
        jitter: root?.getPropertyValue("--chart-jitter").trim() || "#EF5350",
    };

    const base: {
        key: string;
        label: string;
        unit: string;
        color: string;
        displayValue: string;
    }[] = [
        {
            key: "totalResults",
            label: "Total Tests",
            unit: "",
            color: "inherit",
            displayValue: s
                ? Math.round(av.totalResults).toLocaleString()
                : "--",
        },
        {
            key: "avgDownload",
            label: "Avg Download",
            unit: "Mbps",
            color: colors.download,
            displayValue: s ? `${Math.round(av.avgDownload)}` : "--",
        },
        {
            key: "avgUpload",
            label: "Avg Upload",
            unit: "Mbps",
            color: colors.upload,
            displayValue: s ? `${Math.round(av.avgUpload)}` : "--",
        },
        {
            key: "avgPing",
            label: "Avg Ping",
            unit: "ms",
            color: colors.ping,
            displayValue: s ? `${Math.round(av.avgPing)}` : "--",
        },
    ];

    if (showJitter.value) {
        base.push({
            key: "avgJitter",
            label: "Avg Jitter",
            unit: "ms",
            color: colors.jitter,
            displayValue: s ? `${Math.round(av.avgJitter)}` : "--",
        });
    }

    return base;
});
</script>
