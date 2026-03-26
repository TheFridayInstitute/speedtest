<template>
    <div class="relative flex h-dvh w-full flex-col overflow-hidden">
        <!-- Header bar: in flow, i button right, mini meter centered -->
        <div v-if="!isDashboardRoute" class="z-header flex w-full items-center px-2 pt-2 shrink-0">
            <div class="w-9" />
            <div class="flex-1 flex justify-center">
                <Transition name="fade" mode="out-in">
                    <MiniMeter v-if="showMiniMeter" :status="speedtestStatus" />
                </Transition>
            </div>
            <AppHeader
                :servers="serverManager.traditionalServers.value"
                :active-server-id="serverManager.activeServer.value?.id ?? null"
                :client-ip="clientIp"
                :ip-info="ipInfo"
                :looked-up-ip="lookedUpIp"
                @select-server="serverManager.setActiveServer"
            />
        </div>

        <canvas ref="atmosphereCanvas" class="pointer-events-none fixed inset-0 -z-10 h-full w-full" />

        <!-- Scrollable content area — dock stays pinned -->
        <div class="flex min-h-0 flex-1 w-full overflow-hidden">
        <RouterView v-slot="{ Component, route: viewRoute }">
            <Transition name="fade" mode="out-in">
                <div
                    :key="viewRoute.path"
                    class="flex min-h-0 w-full flex-1"
                    :class="viewRoute.name && typeof viewRoute.name === 'string' && (viewRoute.name.startsWith('dashboard') || viewRoute.name.startsWith('admin'))
                        ? ''
                        : 'items-center justify-center px-2 sm:px-4 pb-[var(--dock-footer-space)]'"
                >
                    <component
                        :is="Component"
                        :ref="setViewRef"
                    />
                </div>
            </Transition>
        </RouterView>
        </div>

        <!-- Dock: centralized controls (hidden on dashboard routes) -->
        <Dock
            v-if="!isDashboardRoute"
            :current-view="currentView"
            :speedtest-status="speedtestStatus"
            :can-go-back="canGoBack"
            :survey-state="surveyState"
            @start="onDockStart"
            @stop="onDockStop"
            @next="onDockNext"
            @retake="onDockRetake"
            @back="onDockBack"
            @forward="onDockForward"
            @dashboard="router.push({ name: 'admin' })"
        />

        <ToastProvider :is-dark="isDark" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, watch } from "vue";
import { useRouter, useRoute, RouterView } from "vue-router";
import { useDark } from "@vueuse/core";

import AppHeader from "@src/components/AppHeader.vue";
import MiniMeter from "@src/components/speedtest/MiniMeter.vue";
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
import type { SpeedtestStatus } from "@src/types/speedtest";
import { SpeedtestKey, APIKey, IPInfoKey, GeolocationKey, ServerManagerKey } from "@src/composables/injectionKeys";

import {
    DEFAULT_TRADITIONAL_SERVERS,
    DEFAULT_DNS_SERVERS,
} from "@src/config/servers";

import "@styles/style.css";

// ── Router ───────────────────────────────────────────────────────────

const router = useRouter();
const route = useRoute();

/** Hide the main header and dock on dashboard/admin routes (they have their own nav). */
const isDashboardRoute = computed(() => {
    const name = route.name;
    return typeof name === "string" && (name.startsWith("dashboard") || name.startsWith("admin"));
});

// ── Speedtest composable (lives at app level so it survives view changes) ──

let lastSpeedtestResults: SpeedtestResults | null = null;
const speedtest = useSpeedtest();
const isSpeedtestRunning = ref(false);
const isSpeedtestCompleted = ref(false);

watch(() => speedtest.isRunning.value, (v) => {
    isSpeedtestRunning.value = v;
    if (v) isSpeedtestCompleted.value = false;
});

provide(SpeedtestKey, speedtest);

/** Single reactive object encapsulating speedtest status for UI components. */
const speedtestStatus = computed<SpeedtestStatus>(() => ({
    isRunning: isSpeedtestRunning.value,
    isCompleted: isSpeedtestCompleted.value,
    currentPhase: speedtest.currentStateName.value,
    testStates: speedtest.testStates,
    pingResult: speedtest.pingResult.value,
    downloadResult: speedtest.downloadResult.value,
    uploadResult: speedtest.uploadResult.value,
}));

// ── Dark mode ──────────────────────────────────────────────────────────

const isDark = useDark({ disableTransition: false });

// ── API client ────────────────────────────────────────────────────────

const api = useAPI();
provide(APIKey, api);

// ── IP info ────────────────────────────────────────────────────────────

const ipInfoProvider = useIPInfo();
const { clientIp, ipInfo, lookedUpIp } = ipInfoProvider;
provide(IPInfoKey, ipInfoProvider);

// ── Geolocation (requested lazily when address field is focused) ──────

const geolocation = useGeolocation();
provide(GeolocationKey, geolocation);

// ── Server manager ─────────────────────────────────────────────────────

const serverManager = useServerManager();
provide(ServerManagerKey, serverManager);

for (const server of DEFAULT_TRADITIONAL_SERVERS) {
    serverManager.addServer("traditional", server);
}
for (const server of DEFAULT_DNS_SERVERS) {
    serverManager.addServer("dns", server);
}

// Fetch additional servers from API and auto-select best one
serverManager.fetchAndAutoSelect();

// ── Window messaging (iframe support) ──────────────────────────────────

useWindowMessaging();

// ── Atmosphere canvas ──────────────────────────────────────────────────

const atmosphereCanvas = ref<HTMLCanvasElement | null>(null);

const accentColor = computed(() => {
    if (typeof document === "undefined") return "#808080";
    return getComputedStyle(document.documentElement)
        .getPropertyValue("--th-accent-opaque")
        .trim() || "#808080";
});

useAtmosphereCanvas(atmosphereCanvas, accentColor);

// ── Navigation (dock controls + router-based view state) ─────────────

const surveyRef = ref<any>(null);

/** Capture the survey view ref when on the survey route. */
function setViewRef(el: any) {
    surveyRef.value = route.name === "survey" ? el : null;
}

const nav = useAppNavigation({
    speedtest,
    surveyRef,
    isSpeedtestRunning,
    isSpeedtestCompleted,
    onSpeedtestComplete(results) {
        lastSpeedtestResults = results;
        router.push({ name: "survey" });
    },
});

const { currentView, canGoBack, surveyState, onDockBack, onDockForward, onDockStart, onDockStop, onDockNext, onDockRetake } = nav;

const showMiniMeter = computed(() =>
    currentView.value !== "speedtest" && (speedtestStatus.value.isRunning || speedtestStatus.value.isCompleted),
);

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
</script>
