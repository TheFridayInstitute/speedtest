<template>
    <div class="relative z-10 mx-auto flex h-full w-full max-w-screen-2xl flex-col overflow-hidden">
        <!-- Auth gate -->
        <template v-if="!hasToken">
            <div class="flex flex-1 items-center justify-center p-4">
                <Card class="glass-elevated w-full max-w-sm p-6 text-center">
                    <h3 class="mb-1 text-lg font-semibold">Admin Login</h3>
                    <p class="mb-4 text-sm text-muted-foreground">Enter your token to access the dashboard.</p>
                    <div class="flex gap-2">
                        <Input
                            v-model="tokenInput"
                            type="password"
                            class="flex-1"
                            placeholder="Admin token"
                            @keyup.enter="onSetToken"
                        />
                        <Button variant="accent" @click="onSetToken">
                            Enter
                        </Button>
                    </div>
                </Card>
            </div>
        </template>

        <template v-else>
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
                    variant="glass"
                    size="sm"
                    class="shrink-0 text-sm"
                    @click="onLogout"
                >
                    <LogOut class="h-3.5 w-3.5 sm:mr-1" />
                    <span class="hidden sm:inline">Logout</span>
                </Button>
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

            <!-- Content -->
            <div class="flex-1 overflow-auto p-4">
                <RouterView />
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter, useRoute, RouterView } from "vue-router";
import { ArrowLeft, LogOut } from "lucide-vue-next";
import { Button, Card, Input, UnderlineTabs, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@mkbabb/glass-ui";
import AppHeader from "@src/components/AppHeader.vue";
import { setAdminToken } from "@src/components/dashboard/composables/useDashboardResults";

const router = useRouter();
const route = useRoute();

const isDev = import.meta.env.DEV;
const tokenInput = ref("");
const hasToken = ref(isDev || !!localStorage.getItem("speedtest-admin-token"));

const tabs = [
    { label: "Overview", value: "admin-overview" },
    { label: "Data", value: "admin-data" },
    { label: "Charts", value: "admin-charts" },
    { label: "Map", value: "admin-map" },
    { label: "Settings", value: "admin-settings" },
];

const activeTab = computed(() => {
    const name = String(route.name ?? "");
    // Match child routes to their parent tab
    return tabs.find((t) => name === t.value || name.startsWith(t.value))?.value ?? "admin-overview";
});

function navigateTo(value: string) {
    router.push({ name: value });
}

function onSetToken() {
    if (tokenInput.value) {
        setAdminToken(tokenInput.value);
        hasToken.value = true;
    }
}

function onLogout() {
    localStorage.removeItem("speedtest-admin-token");
    hasToken.value = false;
    router.push({ name: "speedtest" });
}
</script>
