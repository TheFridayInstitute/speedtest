<template>
    <section class="info-progress-container">
        <div class="info-container">
            <div
                v-for="metric in metrics"
                :key="metric.id"
                class="info"
            >
                <div class="header">{{ metric.label }}</div>

                <div
                    class="unit-container"
                    :class="{ 'in-progress': isInProgress(metric.id) }"
                >
                    <div class="amount font-mono" :aria-label="metric.ariaLabel">
                        <LoadingDots v-if="isStarted(metric.id)" />
                        <template v-else-if="resultFor(metric.id).amount">
                            {{ resultFor(metric.id).amount }}
                        </template>
                        <template v-else>&nbsp;</template>
                    </div>
                    <div class="unit italic">
                        <template v-if="resultFor(metric.id).unit">
                            {{ resultFor(metric.id).unit }}
                        </template>
                        <template v-else>{{ metric.defaultUnit }}</template>
                    </div>
                </div>
            </div>
        </div>

        <div ref="progressBarEl" class="progress-bar-container"></div>
    </section>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import type { ComputedRef } from "vue";
import LoadingDots from "./LoadingDots.vue";
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
