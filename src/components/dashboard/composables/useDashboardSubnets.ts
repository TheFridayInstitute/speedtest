import { ref, type Ref } from "vue";
import type { SubnetRow } from "@src/types/dashboard";
import { authHeaders } from "@src/utils/auth";

/**
 * CRUD operations for the subnet-to-entity IP lookup table.
 */
export function useDashboardSubnets() {
    const subnets: Ref<SubnetRow[]> = ref([]);
    const total: Ref<number> = ref(0);
    const page: Ref<number> = ref(1);
    const search: Ref<string> = ref("");
    const isLoading: Ref<boolean> = ref(false);
    const error: Ref<string | null> = ref(null);

    async function fetchSubnets(): Promise<void> {
        isLoading.value = true;
        error.value = null;
        const params = new URLSearchParams();
        params.set("page", String(page.value));
        params.set("limit", "50");
        if (search.value) params.set("search", search.value);

        try {
            const resp = await globalThis.fetch(
                `/api/admin/subnets?${params}`,
                { headers: { ...authHeaders() } },
            );
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const body = await resp.json();
            subnets.value = body.data ?? [];
            total.value = body.total ?? 0;
        } catch (err: any) {
            error.value = err.message;
        } finally {
            isLoading.value = false;
        }
    }

    async function addSubnet(data: {
        prefix: string;
        prefixLength: number;
        entityName: string;
        entityId: string;
        entityType: string;
        networkType: string;
    }): Promise<boolean> {
        try {
            const resp = await globalThis.fetch("/api/admin/subnets", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify(data),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            await fetchSubnets();
            return true;
        } catch (err: any) {
            error.value = err.message;
            return false;
        }
    }

    async function updateSubnet(
        id: string,
        data: Partial<SubnetRow>,
    ): Promise<boolean> {
        try {
            const resp = await globalThis.fetch(`/api/admin/subnets/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...authHeaders() },
                body: JSON.stringify(data),
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            await fetchSubnets();
            return true;
        } catch (err: any) {
            error.value = err.message;
            return false;
        }
    }

    async function deleteSubnet(id: string): Promise<boolean> {
        try {
            const resp = await globalThis.fetch(`/api/admin/subnets/${id}`, {
                method: "DELETE",
                headers: { ...authHeaders() },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            await fetchSubnets();
            return true;
        } catch (err: any) {
            error.value = err.message;
            return false;
        }
    }

    async function triggerSync(): Promise<boolean> {
        try {
            const resp = await globalThis.fetch("/api/admin/sync/trigger", {
                method: "POST",
                headers: { ...authHeaders() },
            });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            await fetchSubnets();
            return true;
        } catch (err: any) {
            error.value = err.message;
            return false;
        }
    }

    return {
        subnets,
        total,
        page,
        search,
        isLoading,
        error,
        fetchSubnets,
        addSubnet,
        updateSubnet,
        deleteSubnet,
        triggerSync,
    };
}
