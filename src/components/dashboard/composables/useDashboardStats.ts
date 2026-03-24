import { ref, type Ref } from "vue";
import type { DashboardStats } from "@src/types/dashboard";
import { authHeaders } from "@src/utils/auth";

/**
 * Fetches aggregate statistics for the dashboard summary cards/charts.
 */
export function useDashboardStats() {
    const stats: Ref<DashboardStats | null> = ref(null);
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    async function fetch(): Promise<void> {
        isLoading.value = true;
        error.value = null;
        try {
            const resp = await globalThis.fetch("/api/admin/stats", {
                headers: { ...authHeaders() },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            stats.value = await resp.json();
        } catch (err: any) {
            error.value = err.message;
        } finally {
            isLoading.value = false;
        }
    }

    return { stats, isLoading, error, fetch };
}
