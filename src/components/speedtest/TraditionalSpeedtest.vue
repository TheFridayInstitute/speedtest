<template>
    <div class="relative z-10 mx-auto w-full max-w-lg">
        <Transition name="pane-swap" mode="out-in">
            <!-- Start pane (has its own Card component) -->
            <StartPane
                v-if="showStartPane"
                key="start"
                title="Let's test your internet speed."
                :visible="true"
                @start="startTest"
            >
                <p class="leading-relaxed">
                    Up to <span class="font-mono">25 MB</span> of data on cellular or satellite connections may be consumed.
                </p>
                <p class="mt-3 leading-relaxed">
                    Press
                    <Button variant="accent" size="xs" class="mx-1 inline-flex align-baseline" @click.stop="startTest">Start</Button>
                    to begin.
                </p>
            </StartPane>

            <!-- Meter + results -->
            <div v-else key="meter" class="space-y-3">
                <SpeedtestMeter />

                <SpeedtestResults
                    :test-states="speedtest.testStates"
                    :ping-result="speedtest.pingResult.value"
                    :download-result="speedtest.downloadResult.value"
                    :upload-result="speedtest.uploadResult.value"
                />
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, inject, watch } from "vue";
import StartPane from "./StartPane.vue";
import SpeedtestMeter from "./SpeedtestMeter.vue";
import SpeedtestResults from "./SpeedtestResults.vue";
import { Button } from "@mkbabb/glass-ui";
import type { UseSpeedtestReturn } from "@src/composables/useSpeedtest";

// ── Injected speedtest instance (owned by App.vue, persists across view changes) ──
const speedtest = inject<UseSpeedtestReturn>("speedtest")!;

// Show the start pane unless the speedtest is (or has been) running
const showStartPane = ref(!speedtest.isRunning.value && speedtest.data.value == null);

// If the component mounts while a test is already running (navigated back),
// make sure we show the meter immediately.
watch(() => speedtest.isRunning.value, (running) => {
    if (running) {
        showStartPane.value = false;
    }
}, { immediate: true });

function startTest(): void {
    showStartPane.value = false;
    speedtest.start();
}
</script>

<style scoped>
.pane-swap-enter-active,
.pane-swap-leave-active {
    transition: opacity 0.3s var(--ease-standard);
}
.pane-swap-enter-from,
.pane-swap-leave-to {
    opacity: 0;
}
</style>
