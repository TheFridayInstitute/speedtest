<template>
    <div class="relative z-10 mx-auto flex h-full w-full max-w-screen-2xl flex-col overflow-hidden">
        <!-- Top nav -->
        <nav class="sticky top-0 z-header flex items-center gap-3 border-b border-border px-4 py-2">
            <!-- Mobile dropdown -->
            <div class="sm:hidden w-fit">
                <Select :model-value="activeTab" @update:model-value="navigateTo">
                    <SelectTrigger class="text-sm w-auto min-w-[5rem]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem v-for="tab in tabs" :key="tab.value" :value="tab.value">
                            {{ tab.label }}
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <!-- Desktop tabs -->
            <div class="hidden sm:contents">
                <UnderlineTabs
                    :options="tabs"
                    :model-value="activeTab"
                    class="text-base"
                    @update:model-value="navigateTo"
                />
            </div>

            <div class="flex-1" />

            <Button
                variant="ghost"
                size="sm"
                class="shrink-0 text-sm text-muted-foreground"
                @click="router.push({ name: 'speedtest' })"
            >
                <ArrowLeft class="h-3.5 w-3.5 sm:mr-1" />
                <span class="hidden sm:inline">Back</span>
            </Button>
            <AppHeader />
        </nav>

        <!-- Content — transitions between dashboard sub-views -->
        <div class="flex-1 overflow-auto p-4">
            <RouterView v-slot="{ Component, route: childRoute }">
                <Transition name="fade" mode="out-in">
                    <div :key="childRoute.path" class="h-full">
                        <component :is="Component" />
                    </div>
                </Transition>
            </RouterView>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter, useRoute, RouterView } from "vue-router";
import { ArrowLeft } from "lucide-vue-next";
import { Button, UnderlineTabs, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@mkbabb/glass-ui";
import AppHeader from "@src/components/AppHeader.vue";

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
