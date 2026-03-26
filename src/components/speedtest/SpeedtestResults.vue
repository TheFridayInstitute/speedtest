<template>
    <section class="relative flex flex-col items-center w-full">
        <!-- Completed metrics: badges colored by metric type -->
        <TransitionGroup
            name="badge"
            tag="div"
            class="flex flex-wrap items-center justify-center gap-3 min-h-[2rem]"
        >
            <div
                v-for="metric in completedMetrics"
                :key="metric.id"
                class="inline-flex items-baseline gap-1 rounded-full bg-card/60 backdrop-blur-sm px-3 py-1 text-sm font-medium shadow-sm"
            >
                <span class="mr-0.5 text-muted-foreground">{{ metric.label }}</span>
                <span class="font-mono text-base" :style="{ color: metricColor(metric.id) }">{{ resultFor(metric.id).amount }}</span>
                <span class="text-xs text-muted-foreground">{{ resultFor(metric.id).unit || metric.defaultUnit }}</span>
            </div>
        </TransitionGroup>

        <!-- Overall progress bar: between completed items and meter -->
        <div class="relative z-10 mb-4 mt-3 h-1 w-full max-w-[16rem] rounded-full bg-muted/30">
            <div
                class="h-full rounded-full transition-all duration-700 ease-out"
                :style="{
                    width: `${progressPercent}%`,
                    background: 'var(--progress-bar-gradient)',
                }"
            />
            <!-- Circle thumbs for completed stages -->
            <div
                v-for="(metric, i) in metrics"
                :key="`thumb-${metric.id}`"
                class="absolute top-1/2 -translate-y-1/2 transition-all duration-500"
                :style="{ left: `${((i + 1) / metrics.length) * 100}%` }"
            >
                <div
                    v-if="isFinished(metric.id)"
                    class="group relative -ml-1.5 h-3 w-3 rounded-full border-2 border-background shadow-sm cursor-default"
                    :style="{ background: 'var(--progress-bar-gradient)' }"
                >
                    <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 whitespace-nowrap rounded-lg bg-popover px-2.5 py-1 text-xs text-popover-foreground shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {{ metric.label }}: {{ resultFor(metric.id).amount }} {{ resultFor(metric.id).unit || metric.defaultUnit }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Meter canvas (rendered by parent via slot) -->
        <div class="relative w-full">
            <slot />

            <!-- "Complete!" overlay — on top of the meter canvas, not over the badges -->
            <Transition name="complete-overlay">
                <div
                    v-if="allComplete"
                    class="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                >
                    <div
                        class="rounded-2xl bg-card/60 backdrop-blur-sm px-6 py-3 shadow-lg pointer-events-auto"
                        style="transform: rotate(-2deg)"
                    >
                        <span class="gold-shimmer-subtle text-6xl font-bold">Complete!</span>
                    </div>
                </div>
            </Transition>
        </div>

        <!-- Bottom area: current test progress bar + active number — fades out on complete but preserves space -->
        <div
            class="flex flex-col items-center w-full transition-opacity"
            :class="allComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'"
            :style="{ transitionDuration: 'var(--duration-panel)' }"
        >
                <!-- Current test progress bar -->
                <div class="z-10 -mt-1 mb-2 h-2.5 w-4/5 max-w-xs rounded-full" :style="{ background: 'var(--meter-background-color)' }">
                    <div
                        class="h-full rounded-full transition-all duration-300 ease-out"
                        :style="{
                            width: `${props.currentTestProgress * 100}%`,
                            minWidth: props.currentTestProgress > 0 ? '0.625rem' : '0',
                            background: 'var(--th-accent-opaque)',
                        }"
                    />
                </div>

                <!-- Active metric display -->
                <div class="flex h-[5.5rem] w-full max-w-[18rem] flex-col items-center justify-center rounded-2xl bg-card/40 backdrop-blur-sm px-2">
                    <Transition name="metric-swap" mode="out-in">
                        <!-- Loading dots -->
                        <div
                            v-if="activeMetric && isStarted(activeMetric.id)"
                            :key="`dots-${activeMetric.id}`"
                            class="flex flex-col items-center gap-1"
                        >
                            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ activeMetric.label }}</div>
                            <LoadingDots />
                        </div>

                        <!-- Active value -->
                        <div
                            v-else-if="activeMetric && hasData(activeMetric.id)"
                            :key="`value-${activeMetric.id}`"
                            class="flex flex-col items-center gap-0.5"
                        >
                            <div class="text-xs font-medium text-muted-foreground uppercase tracking-wider">{{ activeMetric.label }}</div>
                            <div class="flex items-baseline gap-1.5">
                                <span class="font-mono text-4xl font-semibold leading-tight tabular-nums">
                                    {{ resultFor(activeMetric.id).amount }}
                                </span>
                                <span class="text-lg font-medium text-muted-foreground italic">
                                    {{ resultFor(activeMetric.id).unit || activeMetric.defaultUnit }}
                                </span>
                            </div>
                        </div>

                        <!-- Blank -->
                        <div v-else key="blank" />
                    </Transition>
                </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import LoadingDots from "@src/components/LoadingDots.vue";
import { TestState } from "@src/types/speedtest";
import type { TestStateObject, UnitInfo } from "@src/types/speedtest";
import { CHART_COLORS } from "@src/components/dashboard/charts/chartMetrics";

const props = defineProps<{
    testStates: TestStateObject;
    pingResult: UnitInfo;
    downloadResult: UnitInfo;
    uploadResult: UnitInfo;
    currentTestProgress: number;
}>();

// ── Static metric definitions ──────────────────────────────────────────

const metrics = [
    { id: "ping", label: "Latency", ariaLabel: "latency", defaultUnit: "ms" },
    { id: "download", label: "Download", ariaLabel: "download-speed", defaultUnit: "Mbps" },
    { id: "upload", label: "Upload", ariaLabel: "upload-speed", defaultUnit: "Mbps" },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────

function isStarted(metricId: string): boolean {
    return props.testStates[metricId] === TestState.started;
}

function isFinished(metricId: string): boolean {
    const state = props.testStates[metricId];
    return state === TestState.finished || state === TestState.drawFinished;
}

function isActiveOrStarted(metricId: string): boolean {
    const state = props.testStates[metricId];
    return state === TestState.started || state === TestState.active;
}

function hasData(metricId: string): boolean {
    const result = resultFor(metricId);
    return result.amount != null && result.amount !== "";
}

function metricColor(metricId: string): string {
    return CHART_COLORS[metricId] ?? CHART_COLORS.download;
}

function resultFor(metricId: string): UnitInfo {
    if (metricId === "ping") return props.pingResult;
    if (metricId === "download") return props.downloadResult;
    if (metricId === "upload") return props.uploadResult;
    return {};
}

// ── Computed metric lists ───────────────────────────────────────────────

const completedMetrics = computed(() =>
    metrics.filter((m) => isFinished(m.id)),
);

const activeMetric = computed(() =>
    metrics.find((m) => isActiveOrStarted(m.id)) ?? null,
);

const allComplete = computed(() =>
    metrics.every((m) => isFinished(m.id)),
);

const progressPercent = computed(() =>
    (completedMetrics.value.length / metrics.length) * 100,
);

const finishedCount = computed(() => completedMetrics.value.length);

defineExpose({ finishedCount });
</script>

<style scoped>
/* ── Gradient text (uses the dl→ul gradient from tokens) ── */
.gradient-text {
    background: var(--progress-bar-gradient);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
}

/* ── Active metric swap transition ────────────────── */
.metric-swap-enter-active {
    transition: all var(--duration-normal) var(--ease-standard);
}
.metric-swap-leave-active {
    transition: all var(--duration-fast) var(--ease-standard);
}
.metric-swap-enter-from {
    opacity: 0;
    transform: translateY(0.5rem) scale(0.95);
}
.metric-swap-leave-to {
    opacity: 0;
    transform: translateY(-0.5rem) scale(0.95);
}

/* ── Complete badge entrance ──────────────────────── */
.complete-overlay-enter-active {
    transition: all var(--duration-panel) var(--ease-standard);
}
.complete-overlay-leave-active {
    transition: all var(--duration-normal) var(--ease-standard);
}
.complete-overlay-enter-from {
    opacity: 0;
    transform: translateY(1rem) rotate(-2deg) scale(0.8);
}
.complete-overlay-leave-to {
    opacity: 0;
    transform: translateY(-0.5rem) rotate(-2deg) scale(0.9);
}
</style>
