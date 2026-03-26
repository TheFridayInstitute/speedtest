<template>
    <div class="relative z-10 mx-auto flex h-full w-full max-w-screen-2xl flex-col overflow-hidden">
        <!-- Top nav -->
        <nav class="sticky top-0 z-header flex items-center gap-3 border-b border-border px-4 py-2">
            <UnderlineTabs
                :options="tabs"
                :model-value="activeTab"
                class="text-base"
                @update:model-value="navigateTo"
            />

            <div class="flex-1" />

            <DarkModeToggle class="h-5 w-5 shrink-0" />

            <Button
                variant="ghost"
                size="sm"
                class="shrink-0 text-sm text-muted-foreground"
                @click="router.push({ name: 'speedtest' })"
            >
                <ArrowLeft class="mr-1 h-3.5 w-3.5" />
                Back
            </Button>
        </nav>

        <!-- Content -->
        <div class="flex-1 overflow-auto p-4">
            <RouterView />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute, RouterView } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
import { Button, UnderlineTabs, DarkModeToggle } from "@mkbabb/glass-ui";

const router = useRouter();
const route = useRoute();

const tabs = [
    { label: "Map", value: "dashboard-map" },
    { label: "Charts", value: "dashboard-charts" },
];

const activeTab = computed(() => {
    const name = String(route.name ?? "");
    return tabs.find((t) => name === t.value)?.value ?? "dashboard-map";
});

function navigateTo(value: string) {
    router.push({ name: value });
}
</script>
