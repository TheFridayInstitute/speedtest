import { ref } from "vue";
import type { Ref } from "vue";

/**
 * Composable that provides a typed API client for the Hono backend.
 *
 * Session lifecycle: createSession() is called at the start of every test,
 * producing a 1:1 mapping between sessions and test results. The survey
 * (if completed) attaches to the most recent session.
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

    /** Create a new test session. Called at the start of every test. */
    async function createSession(): Promise<string> {
        const { sessionId } = await request<{ sessionId: string }>(
            "/api/sessions",
            { method: "POST" },
        );
        sessionToken.value = sessionId;
        localStorage.setItem(SESSION_KEY, sessionId);
        return sessionId;
    }

    // ── Results ───────────────────────────────────────────────────────

    /** Submit a speedtest result. Session must already exist (from createSession). */
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
        await request("/api/results", {
            method: "POST",
            body: JSON.stringify(result),
        });
    }

    // ── Survey ────────────────────────────────────────────────────────

    /** Submit a survey response. Links to the most recent test session. */
    async function submitSurvey(
        survey: Record<string, unknown>,
    ): Promise<void> {
        await request("/api/surveys", {
            method: "POST",
            body: JSON.stringify(survey),
        });
    }

    /** Skip the survey. */
    async function skipSurvey(): Promise<void> {
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
        submitResult,
        submitSurvey,
        skipSurvey,
        clearSession,
    };
}
