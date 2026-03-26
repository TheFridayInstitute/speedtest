<template>
    <div class="space-y-4">
        <!-- Mobile: tabs with Filters/Results/Sessions -->
        <div class="sm:hidden w-fit">
            <Select v-model="activeTab">
                <SelectTrigger class="text-sm w-auto min-w-[5rem]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem v-for="tab in mobileTabs" :key="tab.value" :value="tab.value">
                        {{ tab.label }}
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
        <!-- Desktop: tabs without Filters (sidebar always visible) -->
        <div class="hidden sm:block">
            <UnderlineTabs
                :options="desktopTabs"
                :model-value="activeTab === 'filters' ? 'results' : activeTab"
                class="text-base"
                @update:model-value="activeTab = $event"
            />
        </div>

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            <!-- Filter sidebar: always visible on desktop, tab-switched on mobile -->
            <div :class="{ 'hidden sm:block': activeTab !== 'filters' }">
                <ResultsFilters />
            </div>

            <!-- Content area: hidden on mobile when filters tab is active -->
            <div v-if="activeTab !== 'filters'" :key="activeTab">
                <ResultsTable
                    v-if="activeTab === 'results'"
                    :rows="resultsComposable.rows.value"
                    :total="resultsComposable.total.value"
                    :page="resultsComposable.page.value"
                    :page-size="resultsComposable.pageSize.value"
                    :is-loading="resultsComposable.isLoading.value"
                    @update:page="resultsComposable.page.value = $event"
                    @export="onExport"
                    @select="onSelectResult"
                />

                <AdminSessionsTable
                    v-else-if="activeTab === 'sessions'"
                    :sessions="adminStore.sessions"
                    :total="adminStore.sessionsTotal"
                    :page="adminStore.sessionsPage"
                    :is-loading="adminStore.sessionsLoading"
                    :ip-filter="ipFilter"
                    @update:page="onSessionsPageChange"
                    @update:ip-filter="onIpFilter"
                />
            </div>
        </div>

        <ResultDetailSheet v-model:open="detailOpen" :row="selectedRow" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { UnderlineTabs, Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@mkbabb/glass-ui";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";
import { useDashboardResults } from "@src/components/dashboard/composables/useDashboardResults";
import { useAdminDashboardDataStore } from "@src/stores/useAdminDashboardDataStore";
import ResultsFilters from "@src/components/dashboard/ResultsFilters.vue";
import ResultsTable from "@src/components/dashboard/ResultsTable.vue";
import AdminSessionsTable from "@src/components/admin/AdminSessionsTable.vue";
import ResultDetailSheet from "@src/components/dashboard/ResultDetailSheet.vue";
import type { DashboardResultRow } from "@src/types/dashboard";

const activeTab = ref("results");
const ipFilter = ref("");
const detailOpen = ref(false);
const selectedRow = ref<DashboardResultRow | null>(null);

function onSelectResult(row: DashboardResultRow) {
    selectedRow.value = row;
    detailOpen.value = true;
}

const mobileTabs = [
    { label: "Filters", value: "filters" },
    { label: "Results", value: "results" },
    { label: "Sessions", value: "sessions" },
];

const desktopTabs = [
    { label: "Results", value: "results" },
    { label: "Sessions", value: "sessions" },
];

const filterStore = useDashboardFilterStore();
const resultsComposable = useDashboardResults();
const adminStore = useAdminDashboardDataStore();

onMounted(() => {
    fetchSessionsFromStore();
});

watch(
    () => ({
        from: filterStore.effectiveDateRange.from,
        to: filterStore.effectiveDateRange.to,
        entityId: filterStore.entityId,
    }),
    () => {
        adminStore.sessionsPage = 1;
        fetchSessionsFromStore();
    },
);

function fetchSessionsFromStore() {
    adminStore.fetchSessions({
        dateFrom: filterStore.effectiveDateRange.from ?? undefined,
        dateTo: filterStore.effectiveDateRange.to ?? undefined,
        entityId: filterStore.entityId ?? undefined,
        ip: ipFilter.value || undefined,
    });
}

function onExport() {
    const params = new URLSearchParams();
    const range = filterStore.effectiveDateRange;
    if (range.from) params.set("dateFrom", range.from);
    if (range.to) params.set("dateTo", range.to);
    window.open(`/api/admin/results/export?${params}`, "_blank");
}

function onSessionsPageChange(page: number) {
    adminStore.sessionsPage = page;
    fetchSessionsFromStore();
}

function onIpFilter(value: string) {
    ipFilter.value = value;
    adminStore.sessionsPage = 1;
    fetchSessionsFromStore();
}
</script>
