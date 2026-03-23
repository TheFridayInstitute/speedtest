<template>
    <div class="flex max-h-[1080px] min-h-screen w-full flex-col">
        <AppHeader
            :servers="serverManager.traditionalServers.value"
            :active-server-id="serverManager.activeServer.value?.id ?? null"
            :client-ip="clientIp"
            :ip-info="ipInfo"
            :looked-up-ip="lookedUpIp"
            @select-server="serverManager.setActiveServer"
        />

        <canvas ref="atmosphereCanvas" class="pointer-events-none fixed inset-0 -z-10 h-full w-full" />

        <SpeedtestTabs />

        <ToastProvider :is-dark="isDark" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useDark } from "@vueuse/core";

import AppHeader from "@src/components/AppHeader.vue";

import SpeedtestTabs from "@src/components/SpeedtestTabs.vue";
import ToastProvider from "@src/components/ToastProvider.vue";

import { useIPInfo } from "@src/composables/useIPInfo";
import { useServerManager } from "@src/composables/useServerManager";
import { useWindowMessaging } from "@src/composables/useWindowMessaging";
import { useAtmosphereCanvas } from "@src/composables/useAtmosphereCanvas";

import {
    DEFAULT_TRADITIONAL_SERVERS,
    DEFAULT_DNS_SERVERS,
} from "@src/config/servers";

import "@styles/style.scss";

// ── Dark mode ──────────────────────────────────────────────────────────

const isDark = useDark({ disableTransition: false });

// ── IP info ────────────────────────────────────────────────────────────

const { clientIp, ipInfo, lookedUpIp } = useIPInfo();

// ── Server manager ─────────────────────────────────────────────────────

const serverManager = useServerManager();

// Register default servers.
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
</script>
