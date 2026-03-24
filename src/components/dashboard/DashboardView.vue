<template>
    <div class="relative z-10 mx-auto w-full max-w-5xl space-y-4 p-4">
        <!-- Back button -->
        <Button
            variant="ghost"
            class="gap-1 text-lg text-muted-foreground hover:text-foreground"
            @click="$emit('back')"
        >
            <ArrowLeft class="h-4 w-4" />
            Back to Speedtest
        </Button>

        <!-- Admin token prompt (shown if no token) -->
        <Card v-if="!hasToken" class="p-6 text-center">
            <p class="mb-3 text-lg">Enter your admin token to access the dashboard.</p>
            <div class="mx-auto flex max-w-sm gap-2">
                <Input
                    v-model="tokenInput"
                    type="password"
                    class="flex-1 text-lg"
                    placeholder="Admin token"
                    @keyup.enter="onSetToken"
                />
                <Button
                    variant="accent"
                    class="text-lg"
                    @click="onSetToken"
                >
                    Enter
                </Button>
            </div>
        </Card>

        <template v-else>
            <!-- Stats -->
            <StatsCards :stats="statsComposable.stats.value" />

            <!-- Main layout: filters + table -->
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
                <ResultsFilters
                    :filters="resultsComposable.filters.value"
                    @update="onFilterUpdate"
                    @reset="onFilterReset"
                />

                <div class="space-y-4">
                    <ResultsTable
                        :rows="resultsComposable.rows.value"
                        :total="resultsComposable.total.value"
                        :page="resultsComposable.page.value"
                        :page-size="resultsComposable.pageSize.value"
                        :is-loading="resultsComposable.isLoading.value"
                        @update:page="resultsComposable.page.value = $event"
                        @export="onExport"
                    />

                    <IPLookupManager
                        :subnets="subnetsComposable.subnets.value"
                        :total="subnetsComposable.total.value"
                        :search="subnetsComposable.search.value"
                        @update:search="subnetsComposable.search.value = $event; subnetsComposable.fetchSubnets()"
                        @add="onAddSubnet"
                        @delete="onDeleteSubnet"
                        @sync="onSyncSubnets"
                    />
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { ArrowLeft } from "lucide-vue-next";
import type { DashboardFilters } from "@src/types/dashboard";
import { useDashboardResults, setAdminToken } from "./composables/useDashboardResults";
import { useDashboardStats } from "./composables/useDashboardStats";
import { useDashboardSubnets } from "./composables/useDashboardSubnets";
import { Button, Card, Input } from "@mkbabb/glass-ui";
import StatsCards from "./StatsCards.vue";
import ResultsFilters from "./ResultsFilters.vue";
import ResultsTable from "./ResultsTable.vue";
import IPLookupManager from "./IPLookupManager.vue";

defineEmits<{ back: [] }>();

const tokenInput = ref("");
const isDev = import.meta.env.DEV;
const hasToken = ref(isDev || !!localStorage.getItem("speedtest-admin-token"));

const resultsComposable = useDashboardResults();
const statsComposable = useDashboardStats();
const subnetsComposable = useDashboardSubnets();

function onSetToken() {
    if (tokenInput.value) {
        setAdminToken(tokenInput.value);
        hasToken.value = true;
        loadAll();
    }
}

function loadAll() {
    resultsComposable.fetch();
    statsComposable.fetch();
    subnetsComposable.fetchSubnets();
}

onMounted(() => {
    if (hasToken.value) loadAll();
});

function onFilterUpdate(key: keyof DashboardFilters, value: string) {
    resultsComposable.filters.value[key] = value;
}

function onFilterReset() {
    resultsComposable.filters.value = {
        dateFrom: "", dateTo: "", testType: "", psuId: "", entityId: "", flow: "",
    };
}

function onExport() {
    const token = localStorage.getItem("speedtest-admin-token");
    if (!token) return;
    const params = new URLSearchParams();
    const f = resultsComposable.filters.value;
    if (f.dateFrom) params.set("dateFrom", f.dateFrom);
    if (f.dateTo) params.set("dateTo", f.dateTo);
    window.open(`/api/admin/results/export?${params}`, "_blank");
}

async function onAddSubnet(data: Parameters<typeof subnetsComposable.addSubnet>[0]) {
    await subnetsComposable.addSubnet(data);
}

async function onDeleteSubnet(id: string) {
    await subnetsComposable.deleteSubnet(id);
}

async function onSyncSubnets() {
    await subnetsComposable.triggerSync();
}
</script>
