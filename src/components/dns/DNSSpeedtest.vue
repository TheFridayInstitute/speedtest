<template>
    <main class="m-auto">
        <StartPane
            title="Let's test your internet speed."
            :visible="showStartPane"
        >
            <p>
                This test will measure the speed of your
                internet connection using DNS queries. Press the
                <span class="rounded-sm p-2 text-th-accent">Start</span>
                button to begin.
            </p>
        </StartPane>

        <SpeedtestButton
            :label="buttonLabel"
            :is-running="dns.isRunning.value"
            @click="handleButtonClick"
        />

        <Transition name="dns-reveal">
            <DNSResultPane
                v-if="showResult"
                :result="dns.result.value"
                :client-u-i-d="dns.clientUID.value"
                :get-formatted-speed="dns.getFormattedSpeed"
            />
        </Transition>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { toast } from "vue-sonner";
import { StartPane, SpeedtestButton } from "@src/components/speedtest";
import DNSResultPane from "./DNSResultPane.vue";
import { useDNSSpeedtest } from "./composables/useDNSSpeedtest";
import type { DNSSpeedtestServer } from "@src/types/server";

// ── Props ──────────────────────────────────────────────────────────────

const props = defineProps<{
    dnsServer: DNSSpeedtestServer;
}>();

// ── Composable ─────────────────────────────────────────────────────────

const dns = useDNSSpeedtest(props.dnsServer);

// ── Local UI state ─────────────────────────────────────────────────────

const showStartPane = ref(true);
const showResult = ref(false);
const hasStartedOnce = ref(false);

// ── Computed button label ──────────────────────────────────────────────

const buttonLabel = computed(() => {
    if (dns.isRunning.value) return "Running...";
    if (hasStartedOnce.value) return "Restart";
    return "Start";
});

// ── Watch for results to reveal the result pane ────────────────────────

watch(
    () => dns.clientUID.value,
    (uid) => {
        if (uid) {
            showResult.value = true;
        }
    },
);

// ── Surface composable errors as toasts ────────────────────────────────

watch(
    () => dns.error.value,
    (err) => {
        if (err) {
            toast.error("DNS speedtest failed", { description: err });
        }
    },
);

// ── Button handler ─────────────────────────────────────────────────────

function handleButtonClick(): void {
    if (dns.isRunning.value) return;

    if (showStartPane.value) {
        showStartPane.value = false;
    }

    hasStartedOnce.value = true;
    dns.start();
}
</script>

<style scoped>
.dns-reveal-enter-active,
.dns-reveal-leave-active {
    transition:
        opacity var(--duration-panel) var(--ease-standard),
        max-height var(--duration-panel) var(--ease-standard);
    overflow: hidden;
}
.dns-reveal-enter-from,
.dns-reveal-leave-to {
    opacity: 0;
    max-height: 0;
}
.dns-reveal-enter-to,
.dns-reveal-leave-from {
    opacity: 1;
    max-height: 800px;
}
</style>
