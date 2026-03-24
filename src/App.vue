<template>
    <div class="relative flex h-dvh w-full flex-col overflow-hidden">
        <AppHeader
            :servers="serverManager.traditionalServers.value"
            :active-server-id="serverManager.activeServer.value?.id ?? null"
            :client-ip="clientIp"
            :ip-info="ipInfo"
            :looked-up-ip="lookedUpIp"
            @select-server="serverManager.setActiveServer"
            @dashboard="currentView = 'dashboard'"
        />

        <canvas ref="atmosphereCanvas" class="pointer-events-none fixed inset-0 -z-10 h-full w-full" />

        <!-- Scrollable content area — header and dock stay pinned -->
        <div class="flex min-h-0 flex-1 w-full items-center justify-center overflow-hidden p-4 pb-[calc(var(--dock-h)+var(--dock-inset)*2)]">

        <!-- View switcher -->
        <Transition name="pane-swap" mode="out-in">
            <SpeedtestTabs
                v-if="currentView === 'speedtest'"
                key="speedtest"
            />

            <SurveyWizard
                v-else-if="currentView === 'survey'"
                key="survey"
                ref="surveyRef"
                :config="surveyConfig"
                :ip-info="ipInfo"
                :looked-up-ip="lookedUpIp"
                :geo-bias="geolocation.coordinates.value"
                @submit="onSurveySubmit"
                @skip="onSurveySkip"
            />

            <ThankYou
                v-else-if="currentView === 'thankyou'"
                key="thankyou"
                @edit="currentView = 'survey'"
            />

            <DashboardView
                v-else-if="currentView === 'dashboard'"
                key="dashboard"
                @back="currentView = 'speedtest'"
            />
        </Transition>
        </div>

        <!-- Dock: centralized controls -->
        <Dock
            :current-view="currentView"
            :is-running="isSpeedtestRunning"
            :test-completed="isSpeedtestCompleted"
            :can-go-back="canGoBack"
            :current-phase="speedtest.currentStateName.value"
            @start="onDockStart"
            @stop="onDockStop"
            @next="onDockNext"
            @retake="onDockRetake"
            @back="onDockBack"
            @forward="onDockForward"
            @dashboard="currentView = 'dashboard'"
        />

        <ToastProvider :is-dark="isDark" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch } from "vue";
import { useDark } from "@vueuse/core";

import AppHeader from "@src/components/AppHeader.vue";
import SpeedtestTabs from "@src/components/SpeedtestTabs.vue";
import SurveyWizard from "@src/components/survey/SurveyWizard.vue";
import ThankYou from "@src/components/survey/ThankYou.vue";
import DashboardView from "@src/components/dashboard/DashboardView.vue";
import { Dock } from "@src/components/dock";
import ToastProvider from "@src/components/ToastProvider.vue";

import { useIPInfo } from "@src/composables/useIPInfo";
import { useServerManager } from "@src/composables/useServerManager";
import { useWindowMessaging } from "@src/composables/useWindowMessaging";
import { useAtmosphereCanvas } from "@mkbabb/glass-ui";
import { useAPI } from "@src/composables/useAPI";
import { useGeolocation } from "@src/composables/useGeolocation";
import { useSpeedtest } from "@src/composables/useSpeedtest";
import { useAppNavigation } from "@src/composables/useAppNavigation";
import type { SpeedtestResults } from "@src/composables/useAppNavigation";

import { DEFAULT_SURVEY_CONFIG } from "@src/config/survey";
import {
    DEFAULT_TRADITIONAL_SERVERS,
    DEFAULT_DNS_SERVERS,
} from "@src/config/servers";

import type { SurveySubmission } from "@src/types/survey";

import "@styles/style.scss";

// ── Speedtest composable (lives at app level so it survives view changes) ──

let lastSpeedtestResults: SpeedtestResults | null = null;
const speedtest = useSpeedtest();
const isSpeedtestRunning = ref(false);
const isSpeedtestCompleted = ref(false);

watch(() => speedtest.isRunning.value, (v) => {
    isSpeedtestRunning.value = v;
    if (v) isSpeedtestCompleted.value = false;
});

provide("speedtest", speedtest);

// ── Dark mode ──────────────────────────────────────────────────────────

const isDark = useDark({ disableTransition: false });

// ── API client ────────────────────────────────────────────────────────

const api = useAPI();

// ── IP info ────────────────────────────────────────────────────────────

const { clientIp, ipInfo, lookedUpIp } = useIPInfo();

// ── Geolocation (requested lazily when address field is focused) ──────

const geolocation = useGeolocation();

// ── Server manager ─────────────────────────────────────────────────────

const serverManager = useServerManager();

for (const server of DEFAULT_TRADITIONAL_SERVERS) {
    serverManager.addServer("traditional", server);
}
for (const server of DEFAULT_DNS_SERVERS) {
    serverManager.addServer("dns", server);
}

// ── Window messaging (iframe support) ──────────────────────────────────

useWindowMessaging();

// ── Atmosphere canvas ──────────────────────────────────────────────────

const atmosphereCanvas = ref<HTMLCanvasElement | null>(null);

const accentColor = computed(() => {
    if (typeof document === "undefined") return "#808080";
    return getComputedStyle(document.documentElement)
        .getPropertyValue("--color-accent-opaque")
        .trim() || "#808080";
});

useAtmosphereCanvas(atmosphereCanvas, accentColor);

// ── Navigation (dock controls + view state) ──────────────────────────

const surveyRef = ref<any>(null);
const surveyConfig = DEFAULT_SURVEY_CONFIG;

const nav = useAppNavigation({
    speedtest,
    surveyRef,
    isSpeedtestRunning,
    isSpeedtestCompleted,
    onSpeedtestComplete(results) {
        lastSpeedtestResults = results;
        nav.currentView.value = "survey";
    },
});

const { currentView, canGoBack, onDockBack, onDockForward, onDockStart, onDockStop, onDockNext, onDockRetake } = nav;

// ── Speedtest initialization ─────────────────────────────────────────

function onSpeedtestEnd(aborted: boolean): void {
    if (!aborted) {
        isSpeedtestCompleted.value = true;
        const results: SpeedtestResults = {
            download: parseFloat(speedtest.data.value?.dlStatus ?? "0"),
            upload: parseFloat(speedtest.data.value?.ulStatus ?? "0"),
            ping: parseFloat(speedtest.data.value?.pingStatus ?? "0"),
            jitter: parseFloat(speedtest.data.value?.jitterStatus ?? "0"),
        };
        lastSpeedtestResults = results;
        submitSpeedtestResults(results);
    }
}

speedtest.initialize(onSpeedtestEnd);
const defaultServer = DEFAULT_TRADITIONAL_SERVERS[0];
if (defaultServer) speedtest.setServer(defaultServer);

// ── API submission helpers ───────────────────────────────────────────

async function submitSpeedtestResults(results: SpeedtestResults) {
    try {
        await api.ensureSession();
        await api.submitResult({
            testType: "traditional",
            serverId: "primary",
            serverName: "Friday Institute Primary",
            ...results,
        });
    } catch {
        // Backend unavailable — results will be lost, but that's acceptable
    }
}

async function onSurveySubmit(submission: SurveySubmission) {
    try {
        await api.submitSurvey({
            flow: submission.flowType,
            name: submission.answers.name,
            address: submission.answers.address,
            provider: submission.answers.provider,
            psuId: submission.answers.psuId,
            psuName: submission.answers.psuName,
            entityName: submission.answers.psuName,
            entityId: submission.answers.psuId,
            schoolName: submission.answers.schoolName,
            schoolNumber: submission.answers.schoolNumber,
            classroomName: submission.answers.classroomName,
            classroomNumber: submission.answers.classroomNumber,
            connectionType: submission.answers.connectionType,
        });
    } catch {
        // Best-effort
    }
    currentView.value = "thankyou";
}

async function onSurveySkip() {
    try {
        await api.skipSurvey();
    } catch {
        // Best-effort
    }
    currentView.value = "speedtest";
}
</script>

<style scoped>
.pane-swap-enter-active,
.pane-swap-leave-active {
    transition:
        opacity var(--duration-panel, 0.5s) var(--ease-dock, ease),
        transform var(--duration-panel, 0.5s) var(--ease-dock, ease);
}
.pane-swap-enter-from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
}
.pane-swap-leave-to {
    opacity: 0;
    transform: translateY(-8px) scale(0.98);
}
</style>
