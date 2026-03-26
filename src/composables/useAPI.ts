import { ref } from "vue";
import type { Ref } from "vue";

/**
 * Composable that provides a typed API client for the Hono backend.
 * Manages session tokens and provides methods for all API endpoints.
 */
export function useAPI() {
    const SESSION_KEY = "speedtest-session";

    /** Current session token. */
    const sessionToken: Ref<string | null> = ref(
        typeof localStorage !== "undefined"
            ? localStorage.getItem(SESSION_KEY)
            : null,
    );

    /** Whether a request is in-flight. */
    const isLoading: Ref<boolean> = ref(false);

    /** Last error message. */
    const error: Ref<string | null> = ref(null);

    // ── Helpers ───────────────────────────────────────────────────────

    function headers(): Record<string, string> {
        const h: Record<string, string> = {
            "Content-Type": "application/json",
        };
        if (sessionToken.value) {
            h["X-Session-Token"] = sessionToken.value;
        }
        return h;
    }

    async function request<T>(
        url: string,
        options?: RequestInit,
    ): Promise<T> {
        error.value = null;
        isLoading.value = true;
        try {
            const resp = await fetch(url, {
                ...options,
                headers: { ...headers(), ...options?.headers },
            });
            if (!resp.ok) {
                const body = await resp.json().catch(() => ({}));
                throw new Error(
                    (body as any).error ?? `HTTP ${resp.status}`,
                );
            }
            return (await resp.json()) as T;
        } catch (err: any) {
            error.value = err.message;
            throw err;
        } finally {
            isLoading.value = false;
        }
    }

    // ── Session ───────────────────────────────────────────────────────

    /** Create a new test session. Returns the session token. */
    async function createSession(): Promise<string> {
        const { sessionId } = await request<{ sessionId: string }>(
            "/api/sessions",
            { method: "POST" },
        );
        sessionToken.value = sessionId;
        localStorage.setItem(SESSION_KEY, sessionId);
        return sessionId;
    }

    /** Ensure a session exists, creating one if needed. */
    async function ensureSession(): Promise<string> {
        if (sessionToken.value) return sessionToken.value;
        return createSession();
    }

    // ── Results ───────────────────────────────────────────────────────

    /** Submit a speedtest result. In dev mode, log but don't record. */
    async function submitResult(result: {
        testType: "traditional" | "dns";
        serverId: string;
        serverName: string;
        download?: number;
        upload?: number;
        ping?: number;
        jitter?: number;
        dnsDownloadSpeed?: number;
        dnsUid?: string;
        raw?: Record<string, unknown>;
    }): Promise<void> {
        if (import.meta.env.DEV) {
            console.log("[DEV] Speedtest result (not recorded):", result);
            return;
        }
        await ensureSession();
        await request("/api/results", {
            method: "POST",
            body: JSON.stringify(result),
        });
    }

    // ── Survey ────────────────────────────────────────────────────────

    /** Submit a survey response. */
    async function submitSurvey(
        survey: Record<string, unknown>,
    ): Promise<void> {
        await ensureSession();
        await request("/api/surveys", {
            method: "POST",
            body: JSON.stringify(survey),
        });
    }

    /** Skip the survey. */
    async function skipSurvey(): Promise<void> {
        await ensureSession();
        await request("/api/surveys/skip", { method: "POST" });
    }

    // ── Cleanup ───────────────────────────────────────────────────────

    /** Clear the current session. */
    function clearSession(): void {
        sessionToken.value = null;
        localStorage.removeItem(SESSION_KEY);
    }

    return {
        sessionToken,
        isLoading,
        error,
        createSession,
        ensureSession,
        submitResult,
        submitSurvey,
        skipSurvey,
        clearSession,
    };
}
