<template>
    <section class="speedtest-container relative mx-auto w-full max-w-sm">
        <div class="speedtest relative aspect-square w-full">
            <canvas ref="meterCanvas" class="absolute inset-0 h-full w-full" />
            <canvas
                ref="glassCanvas"
                class="absolute inset-0 h-full w-full pointer-events-none"
            />
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useMeterRenderer } from "@src/composables/useMeterRenderer";
import type { SpeedtestData, TestStateObject, UnitInfo } from "@src/types/speedtest";

// ── Props ──────────────────────────────────────────────────────────────

const props = defineProps<{
    /** Latest data payload from the speedtest worker. */
    speedtestData: SpeedtestData | null;
    /** Current human-readable state name (e.g. "download", "ping"). */
    currentStateName: string | undefined;
    /** Per-metric state tracker. */
    testStates: TestStateObject;
    /** Whether the speedtest is actively running. */
    isRunning: boolean;
    /** Get numeric state amount for a metric. */
    getSpeedtestStateAmount: (stateName: string, kind?: string) => number;
    /** Build a UnitInfo object for a given metric. */
    getStateUnitInfo: (stateName: string, stateAmount?: number) => UnitInfo;
}>();

// ── Template refs ──────────────────────────────────────────────────────

const meterCanvas = ref<HTMLCanvasElement | null>(null);
const glassCanvas = ref<HTMLCanvasElement | null>(null);

// ── Composable — all rendering logic lives here ────────────────────────

const renderer = useMeterRenderer(meterCanvas, glassCanvas, props);

// ── Lifecycle ──────────────────────────────────────────────────────────

onMounted(() => renderer.initialize());
onUnmounted(() => renderer.dispose());
</script>
