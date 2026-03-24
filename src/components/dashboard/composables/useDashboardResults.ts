import { ref, watch, type Ref } from "vue";
import type { DashboardFilters, DashboardResultRow } from "@src/types/dashboard";
import { authHeaders } from "@src/utils/auth";

/**
 * Fetches and paginates dashboard result rows.
 * Separated from stats/subnets to keep each composable focused.
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

    // Re-fetch when page or filters change
    watch([page, filters], fetch, { deep: true });

    return { rows, total, page, pageSize, isLoading, error, filters, fetch };
}

export { setAdminToken } from "@src/utils/auth";
