<template>
    <div class="space-y-4">
        <UnderlineTabs
            :options="subTabs"
            :model-value="activeTab"
            class="text-base"
            @update:model-value="activeTab = $event"
        />

        <div class="grid grid-cols-1 gap-4 lg:grid-cols-[220px_1fr]">
            <!-- Shared filter sidebar (always visible, Pinia-backed) -->
            <ResultsFilters />

            <!-- Results sub-tab -->
            <template v-if="activeTab === 'results'">
                <ResultsTable
                    :rows="resultsComposable.rows.value"
                    :total="resultsComposable.total.value"
                    :page="resultsComposable.page.value"
                    :page-size="resultsComposable.pageSize.value"
                    :is-loading="resultsComposable.isLoading.value"
                    @update:page="resultsComposable.page.value = $event"
                    @export="onExport"
                    @select="() => {}"
                />
            </template>

            <!-- Sessions sub-tab -->
            <template v-else-if="activeTab === 'sessions'">
                <AdminSessionsTable
                    :sessions="adminStore.sessions"
                    :total="adminStore.sessionsTotal"
                    :page="adminStore.sessionsPage"
                    :is-loading="adminStore.sessionsLoading"
                    :ip-filter="ipFilter"
                    @update:page="onSessionsPageChange"
                    @update:ip-filter="onIpFilter"
                />
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { UnderlineTabs } from "@mkbabb/glass-ui";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";
import { useDashboardResults } from "@src/components/dashboard/composables/useDashboardResults";
import { useAdminDashboardDataStore } from "@src/stores/useAdminDashboardDataStore";
import ResultsFilters from "@src/components/dashboard/ResultsFilters.vue";
import ResultsTable from "@src/components/dashboard/ResultsTable.vue";
import AdminSessionsTable from "@src/components/admin/AdminSessionsTable.vue";

const activeTab = ref("results");
const ipFilter = ref("");

const subTabs = [
    { label: "Results", value: "results" },
    { label: "Sessions", value: "sessions" },
];

const filterStore = useDashboardFilterStore();
const resultsComposable = useDashboardResults();
const adminStore = useAdminDashboardDataStore();

// Fetch sessions on mount and whenever Pinia filter store changes
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
