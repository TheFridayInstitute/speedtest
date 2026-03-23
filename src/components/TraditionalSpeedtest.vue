<template>
    <div class="relative z-10 mx-auto grid w-full max-w-lg gap-3" style="grid-template-rows: 1fr auto auto">
        <!-- Start pane OR meter — same grid cell, animated swap -->
        <div class="min-h-0">
            <Transition name="pane-swap" mode="out-in">
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

                <SpeedtestMeter
                    v-else
                    key="meter"
                    :speedtest-data="speedtest.data.value"
                    :current-state-name="speedtest.currentStateName.value"
                    :test-states="speedtest.testStates"
                    :is-running="speedtest.isRunning.value"
                    :get-speedtest-state-amount="speedtest.getSpeedtestStateAmount"
                    :get-state-unit-info="speedtest.getStateUnitInfo"
                />
            </Transition>
        </div>

        <!-- Results row -->
        <Transition name="pane-swap">
            <SpeedtestResults
                v-if="showMeter"
                :test-states="speedtest.testStates"
                :ping-result="speedtest.pingResult.value"
                :download-result="speedtest.downloadResult.value"
                :upload-result="speedtest.uploadResult.value"
            />
        </Transition>

        <!-- Button — always bottom-right, never moves -->
        <div class="flex justify-end">
            <SpeedtestButton
                :label="buttonLabel"
                :is-running="speedtest.isRunning.value"
                @click="handleButtonClick"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import StartPane from "./StartPane.vue";
import SpeedtestMeter from "./SpeedtestMeter.vue";
import SpeedtestResults from "./SpeedtestResults.vue";
import SpeedtestButton from "./SpeedtestButton.vue";
import { Button } from "@components/ui/button";
import { useSpeedtest } from "@src/composables/useSpeedtest";
import { DEFAULT_TRADITIONAL_SERVERS } from "@src/config/servers";
import { throttle } from "@utils/timing";

const speedtest = useSpeedtest();

const showStartPane = ref(true);
const showMeter = ref(false);
const testCompleted = ref(false);

const buttonLabel = computed(() => {
    if (testCompleted.value && !speedtest.isRunning.value) return "Next →";
    if (speedtest.isRunning.value) return "Stop";
    return "Start";
});

function startTest(): void {
    showStartPane.value = false;
    showMeter.value = true;
    speedtest.start();
}

function abortTest(): void {
    speedtest.abort();
    testCompleted.value = false;
}

function resetToStart(): void {
    testCompleted.value = false;
    showMeter.value = false;
    showStartPane.value = true;
    speedtest.abort();
}

function onTestEnd(aborted: boolean): void {
    if (!aborted) {
        testCompleted.value = true;
    }
}

const handleButtonClick = throttle(() => {
    if (speedtest.isRunning.value) {
        abortTest();
    } else if (testCompleted.value) {
        resetToStart();
    } else {
        startTest();
    }
}, 750);

onMounted(() => {
    speedtest.initialize(onTestEnd);
    const server = DEFAULT_TRADITIONAL_SERVERS[0];
    if (server) {
        speedtest.setServer(server);
    }
});
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
