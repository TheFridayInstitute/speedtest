<template>
    <section class="info-progress-container">
        <div class="info-container">
            <div
                v-for="metric in metrics"
                :key="metric.id"
                class="info"
                :class="{ 'metric-complete': isFinished(metric.id) }"
            >
                <div
                    class="header"
                    :style="{
                        fontSize: isFinished(metric.id) ? 'var(--text-xl)' : 'var(--text-lg)',
                        transition: 'font-size 0.3s var(--ease-standard)',
                    }"
                >{{ metric.label }}</div>

                <div
                    class="unit-container"
                    :class="{
                        'shimmer-in-progress': isActive(metric.id),
                    }"
                >
                    <!-- Loading dots: only when metric just started (no data yet) -->
                    <div
                        v-if="isStarted(metric.id)"
                        class="amount font-mono flex items-center justify-center"
                    >
                        <LoadingDots />
                    </div>

                    <!-- Active / finished: show the number -->
                    <template v-else-if="resultFor(metric.id).amount">
                        <div
                            class="amount font-mono"
                            :class="{ 'gold-shimmer-text': isFinished(metric.id) }"
                            :aria-label="metric.ariaLabel"
                        >
                            {{ resultFor(metric.id).amount }}
                        </div>
                        <div
                            class="unit italic"
                            :class="{ 'gold-shimmer-text': isFinished(metric.id) }"
                        >
                            {{ resultFor(metric.id).unit || metric.defaultUnit }}
                        </div>
                    </template>

                    <!-- Not started yet: blank -->
                    <div v-else class="amount font-mono">&nbsp;</div>
                </div>
            </div>
        </div>

        <div ref="progressBarEl" class="progress-bar-container"></div>
    </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import type { ComputedRef } from "vue";
import LoadingDots from "@src/components/LoadingDots.vue";
import { createProgressBar, animateProgressBarWrapper } from "@utils/timing";
import { getComputedVariable } from "@utils/utils";
import { TestState } from "@src/types/speedtest";
import type { TestStateObject, UnitInfo } from "@src/types/speedtest";

const props = defineProps<{
    testStates: TestStateObject;
    pingResult: UnitInfo;
    downloadResult: UnitInfo;
    uploadResult: UnitInfo;
}>();

// ── Static metric definitions ──────────────────────────────────────────

const metrics = [
    { id: "ping", label: "Latency", ariaLabel: "latency", defaultUnit: "ms" },
    { id: "download", label: "Download", ariaLabel: "download-speed", defaultUnit: "Mbps" },
    { id: "upload", label: "Upload", ariaLabel: "upload-speed", defaultUnit: "Mbps" },
] as const;

// ── Progress bar DOM ref ───────────────────────────────────────────────

const progressBarEl = ref<HTMLElement | null>(null);

// ── Helpers ────────────────────────────────────────────────────────────

function isInProgress(metricId: string): boolean {
    const state = props.testStates[metricId];
    return (
        state === TestState.notStarted ||
        state === TestState.started ||
        state === TestState.active
    );
}

function isStarted(metricId: string): boolean {
    return props.testStates[metricId] === TestState.started;
}

/** Currently measuring — has data flowing in. */
function isActive(metricId: string): boolean {
    return props.testStates[metricId] === TestState.active;
}

function isFinished(metricId: string): boolean {
    const state = props.testStates[metricId];
    return state === TestState.finished || state === TestState.drawFinished;
}

function resultFor(metricId: string): UnitInfo {
    if (metricId === "ping") return props.pingResult;
    if (metricId === "download") return props.downloadResult;
    if (metricId === "upload") return props.uploadResult;
    return {};
}

/**
 * Animate the DOM progress bar forward by one segment.
 * Called reactively when a metric finishes.
 */
function advanceProgressBar(): void {
    if (progressBarEl.value) {
        animateProgressBarWrapper(progressBarEl.value, 1000, 3);
    }
}

// ── Expose the advance function so parent can call it if needed ────────

defineExpose({ advanceProgressBar });

// ── Watch for metric state transitions to advance progress bar ─────────

const finishedCount: ComputedRef<number> = computed(() => {
    let count = 0;
    for (const m of metrics) {
        const state = props.testStates[m.id];
        if (state === TestState.finished || state === TestState.drawFinished) {
            count++;
        }
    }
    return count;
});

// Use a simple watch to advance bar when finished count increases.
let lastFinished = 0;
watch(finishedCount, (count) => {
    if (count > lastFinished) {
        advanceProgressBar();
        lastFinished = count;
    }
});

// ── Mount: create the DOM progress bar ─────────────────────────────────

onMounted(() => {
    if (progressBarEl.value) {
        const borderRadius = getComputedVariable("--border-radius-primary");
        const gradient = getComputedVariable("--progress-bar-gradient");

        createProgressBar(
            progressBarEl.value,
            [gradient],
            {
                styles: {
                    "border-top-left-radius": borderRadius,
                    "border-bottom-left-radius": borderRadius,
                },
            },
            {
                styles: {
                    "border-top-right-radius": borderRadius,
                    "border-bottom-right-radius": borderRadius,
                },
            },
        );
    }
});
</script>

<style scoped>
/* ── Info & progress layout ─────────────────────────── */
.info-progress-container .info-container {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
}

.info-progress-container .info {
    display: flex;
    flex: 1;
    flex-direction: column;
}

.info-progress-container .header {
    padding: 0.25rem 0;
}

.info-progress-container .unit-container {
    padding: 0.5rem;
    height: 100%;
    width: 100%;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    -webkit-backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
    border-radius: var(--radius);
    text-align: left;
}

.info-progress-container .unit-container .dot-container {
    height: 100%;
    width: 100%;
}

.info-progress-container .progress-bar-container {
    margin: 0.75rem 0 0;
    min-height: 1rem;
}

/* ── Progress bar ──────────────────────────────────── */
.progress-bar-container {
    display: flex;
    position: relative;
    height: 1rem;
    width: 100%;
    box-sizing: border-box;
    flex-direction: row;
}

.progress-bar-container :deep(.progress-bar) {
    height: 1rem;
    width: 0;
    border-radius: 0;
}

/* ── Unit container ────────────────────────────────── */
.unit-container {
    --font-size-lg: 2rem;
    --font-size-sm: calc(var(--font-size-lg) * 0.5);
    display: flex;
    position: relative;
    margin: 0;
    box-sizing: border-box;
    flex-direction: column;
    text-align: left;
    transition: all var(--ease-in-out) 1000ms;
}

.unit-container.in-progress {
    color: hsl(var(--foreground));
}

.unit-container.shimmer-in-progress .amount,
.unit-container.shimmer-in-progress .unit {
    color: hsl(var(--foreground) / 0.4);
    animation: shimmer-pulse 1.5s ease-in-out infinite;
}

.unit-container .amount {
    font-size: var(--font-size-lg);
    line-height: 1.1;
}

.unit-container .unit {
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    line-height: 1.2;
}
</style>
