import { defineStore } from "pinia";
import { ref } from "vue";

export interface AdminSession {
    _id: string;
    clientIp: string;
    ipHash: string;
    ipInfo: { org?: string; city?: string; region?: string; loc?: string } | null;
    entityLookup: { entityName?: string; entityId?: string } | null;
    userAgent: string;
    createdAt: string;
    lastSeenAt: string;
    resultCount: number;
    surveyStatus: "completed" | "skipped" | "none";
}

export interface ServerHealth {
    serverId: string;
    name: string;
    region: string;
    host: string;
    active: boolean;
    currentLoad: number;
    capacity: number;
    lastHeartbeat: string;
    status: "healthy" | "degraded" | "offline";
}

function authHeaders(): Record<string, string> {
    const token = localStorage.getItem("speedtest-admin-token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
}

export const useAdminDashboardDataStore = defineStore("adminDashboardData", () => {
    // ── Sessions ─────────────────────────────────────────────────────
    const sessions = ref<AdminSession[]>([]);
    const sessionsTotal = ref(0);
    const sessionsPage = ref(1);
    const sessionsLoading = ref(false);

    async function fetchSessions(filters?: { dateFrom?: string; dateTo?: string; entityId?: string; ip?: string }) {
        sessionsLoading.value = true;
        try {
            const params = new URLSearchParams();
            params.set("page", String(sessionsPage.value));
            params.set("limit", "50");
            if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
            if (filters?.dateTo) params.set("dateTo", filters.dateTo);
            if (filters?.entityId) params.set("entityId", filters.entityId);
            if (filters?.ip) params.set("ip", filters.ip);

            const res = await fetch(`/api/admin/sessions?${params}`, { headers: authHeaders() });
            if (res.ok) {
                const data = await res.json();
                sessions.value = data.data;
                sessionsTotal.value = data.total;
            }
        } catch (e) {
            console.warn("[admin] sessions fetch failed:", e);
        } finally {
            sessionsLoading.value = false;
        }
    }

    // ── Servers ──────────────────────────────────────────────────────
    const servers = ref<ServerHealth[]>([]);
    const serversLoading = ref(false);

    async function fetchServers() {
        serversLoading.value = true;
        try {
            const res = await fetch("/api/admin/servers", { headers: authHeaders() });
            if (res.ok) {
                servers.value = await res.json();
            }
        } catch (e) {
            console.warn("[admin] servers fetch failed:", e);
        } finally {
            serversLoading.value = false;
        }
    }

    async function registerServer(server: { serverId: string; name: string; region: string; host: string; port: number }) {
        const res = await fetch("/api/admin/servers", {
            method: "POST",
            headers: { ...authHeaders(), "Content-Type": "application/json" },
            body: JSON.stringify(server),
        });
        if (res.ok) await fetchServers();
        return res.ok;
    }

    async function removeServer(serverId: string) {
        const res = await fetch(`/api/admin/servers/${serverId}`, {
            method: "DELETE",
            headers: authHeaders(),
        });
        if (res.ok) await fetchServers();
        return res.ok;
    }

    return {
        sessions,
        sessionsTotal,
        sessionsPage,
        sessionsLoading,
        fetchSessions,

        servers,
        serversLoading,
        fetchServers,
        registerServer,
        removeServer,
    };
});
