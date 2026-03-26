import { ref, watch, type Ref } from "vue";
import type { DashboardFilters, DashboardResultRow } from "@src/types/dashboard";
import { authHeaders } from "../utils/auth";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";

/**
 * Fetches and paginates dashboard result rows.
 * Syncs with the global filter store for cross-filtering (chart brush → table).
 */
export function useDashboardResults() {
    const rows: Ref<DashboardResultRow[]> = ref([]);
    const total: Ref<number> = ref(0);
    const page: Ref<number> = ref(1);
    const pageSize: Ref<number> = ref(25);
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    const filters: Ref<DashboardFilters> = ref({
        dateFrom: "",
        dateTo: "",
        testType: "",
        psuId: "",
        entityId: "",
        flow: "",
    });

    // Cross-filter: sync global filter store into local filters
    try {
        const filterStore = useDashboardFilterStore();
        watch(
            () => ({
                ...filterStore.effectiveDateRange,
                testType: filterStore.testType,
                psuId: filterStore.psuId,
                entityId: filterStore.entityId,
                provider: filterStore.provider,
                flow: filterStore.flow,
            }),
            (state) => {
                if (state.from !== (filters.value.dateFrom || null)) {
                    filters.value.dateFrom = state.from ?? "";
                }
                if (state.to !== (filters.value.dateTo || null)) {
                    filters.value.dateTo = state.to ?? "";
                }
                if (state.testType !== (filters.value.testType || null)) {
                    filters.value.testType = state.testType ?? "";
                }
                if (state.psuId !== (filters.value.psuId || null)) {
                    filters.value.psuId = state.psuId ?? "";
                }
                if (state.entityId !== (filters.value.entityId || null)) {
                    filters.value.entityId = state.entityId ?? "";
                }
                if (state.flow !== (filters.value.flow || null)) {
                    filters.value.flow = state.flow ?? "";
                }
            },
            { immediate: true },
        );
    } catch {
        // Pinia not available (e.g., in tests) — skip cross-filter sync
    }

    async function fetch(): Promise<void> {
        isLoading.value = true;
        error.value = null;

        const params = new URLSearchParams();
        params.set("page", String(page.value));
        params.set("limit", String(pageSize.value));
        if (filters.value.dateFrom) params.set("dateFrom", filters.value.dateFrom);
        if (filters.value.dateTo) params.set("dateTo", filters.value.dateTo);
        if (filters.value.testType) params.set("testType", filters.value.testType);
        if (filters.value.psuId) params.set("psuId", filters.value.psuId);
        if (filters.value.entityId) params.set("entityId", filters.value.entityId);

        try {
            const resp = await globalThis.fetch(
                `/api/admin/results?${params}`,
                { headers: { ...authHeaders() } },
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const body = await resp.json();
            rows.value = body.data ?? [];
            total.value = body.total ?? 0;
        } catch (err: any) {
            error.value = err.message;
        } finally {
            isLoading.value = false;
        }
    }

    // Fetch immediately and re-fetch when page or filters change
    watch([page, filters], fetch, { deep: true, immediate: true });

    return { rows, total, page, pageSize, isLoading, error, filters, fetch };
}

export { setAdminToken } from "../utils/auth";
