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
import { ref, inject, reactive, onMounted, onUnmounted } from "vue";
import { useMeterRenderer } from "@src/composables/useMeterRenderer";
import type { MeterRendererProps } from "@src/composables/useMeterRenderer";
import type { UseSpeedtestReturn } from "@src/composables/useSpeedtest";

// ── Inject speedtest composable (provided by App.vue) ─────────────────

const speedtest = inject<UseSpeedtestReturn>("speedtest")!;

// ── Build a reactive props object from the injected composable ─────────
// useMeterRenderer watches props.currentStateName and props.isRunning,
// so the object must be reactive (not a new object each render).

const meterProps = reactive<MeterRendererProps>({
    get speedtestData() { return speedtest.data.value; },
    get currentStateName() { return speedtest.currentStateName.value; },
    get isRunning() { return speedtest.isRunning.value; },
    getSpeedtestStateAmount: speedtest.getSpeedtestStateAmount,
    getStateUnitInfo: speedtest.getStateUnitInfo,
});

// ── Template refs ──────────────────────────────────────────────────────

const meterCanvas = ref<HTMLCanvasElement | null>(null);
const glassCanvas = ref<HTMLCanvasElement | null>(null);

// ── Composable — all rendering logic lives here ────────────────────────

const renderer = useMeterRenderer(meterCanvas, glassCanvas, meterProps);

// ── Lifecycle ──────────────────────────────────────────────────────────

onMounted(() => renderer.initialize());
onUnmounted(() => renderer.dispose());
</script>

<style scoped>
.speedtest {
    overflow: hidden;
    margin-bottom: -10%;
}
</style>
