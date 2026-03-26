import { computed, ref, nextTick, unref, type Ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { UseSpeedtestReturn } from "./useSpeedtest";
import type { SurveyDockState } from "@src/components/dock/Dock.vue";

export type AppView = "speedtest" | "survey" | "dashboard" | "thankyou";

interface AppNavigationOptions {
    speedtest: UseSpeedtestReturn;
    surveyRef: Ref<any>;
    isSpeedtestRunning: Ref<boolean>;
    isSpeedtestCompleted: Ref<boolean>;
    onSpeedtestComplete: (results: SpeedtestResults) => void;
    createSession: () => Promise<string>;
}

export interface SpeedtestResults {
    download: number;
    upload: number;
    ping: number;
    jitter: number;
}

/** Map route names to AppView values for the dock. */
function routeToView(routeName: string | symbol | null | undefined): AppView {
    if (!routeName || typeof routeName !== "string") return "speedtest";
    if (routeName === "survey") return "survey";
    if (routeName === "thankyou") return "thankyou";
    if (routeName.startsWith("dashboard") || routeName.startsWith("admin")) return "dashboard";
    return "speedtest";
}

export function useAppNavigation(opts: AppNavigationOptions) {
    const { speedtest, surveyRef, isSpeedtestRunning, isSpeedtestCompleted, onSpeedtestComplete, createSession } = opts;
    const isCreatingSession = ref(false);
    const router = useRouter();
    const route = useRoute();

    /** Computed view derived from the current route, for dock compatibility. */
    const currentView = computed<AppView>(() => routeToView(route.name));

    const canGoBack = computed(() => {
        const view = currentView.value;
        return view === "survey" || view === "thankyou" || view === "dashboard";
    });

    function startSpeedtest(): void {
        isSpeedtestCompleted.value = false;
        speedtest.start();
    }

    function parseResults(): SpeedtestResults {
        return {
            download: parseFloat(speedtest.data.value?.dlStatus ?? "0"),
            upload: parseFloat(speedtest.data.value?.ulStatus ?? "0"),
            ping: parseFloat(speedtest.data.value?.pingStatus ?? "0"),
            jitter: parseFloat(speedtest.data.value?.jitterStatus ?? "0"),
        };
    }

    function getWizardRef() {
        return surveyRef.value?.surveyRef ?? surveyRef.value;
    }

    function onDockBack() {
        const view = currentView.value;
        if (view === "survey") {
            const wizard = getWizardRef();
            if (unref(wizard?.editingFromReview)) {
                wizard.returnToReview();
                return;
            }
            const survey = wizard?.survey;
            if (survey && !unref(survey.isFirstStep)) {
                survey.prevStep();
            } else {
                router.push({ name: "speedtest" });
            }
        } else if (view === "thankyou") {
            router.push({ name: "survey" });
        } else if (view === "dashboard") {
            router.push({ name: "speedtest" });
        }
    }

    function onDockForward() {
        const view = currentView.value;
        if (view === "speedtest") {
            router.push({ name: "survey" });
        } else if (view === "survey") {
            const wizard = getWizardRef();
            if (unref(wizard?.editingFromReview)) {
                wizard.returnToReview();
                return;
            }
            const survey = wizard?.survey;
            if (survey && !unref(survey.isLastStep)) {
                survey.nextStep();
            } else if (unref(survey?.isLastStep)) {
                wizard?.submitFromDock?.();
            }
        } else if (view === "thankyou") {
            router.push({ name: "speedtest" });
        }
    }

    async function onDockStart() {
        if (isCreatingSession.value) return;
        if (currentView.value !== "speedtest") {
            router.push({ name: "speedtest" });
        }
        isCreatingSession.value = true;
        try {
            await createSession();
        } catch {
            // Session creation failed — proceed anyway (result submission will fail gracefully)
        } finally {
            isCreatingSession.value = false;
        }
        nextTick(() => startSpeedtest());
    }

    function onDockStop() {
        speedtest.abort();
        isSpeedtestCompleted.value = false;
    }

    function onDockNext() {
        router.push({ name: "survey" });
    }

    async function onDockRetake() {
        if (isCreatingSession.value) return;
        isSpeedtestCompleted.value = false;
        isSpeedtestRunning.value = false;
        router.push({ name: "speedtest" });
        isCreatingSession.value = true;
        try {
            await createSession();
        } catch {
            // Proceed anyway
        } finally {
            isCreatingSession.value = false;
        }
        nextTick(() => startSpeedtest());
    }

    /** Reactive survey state for the dock bar UI. */
    const surveyState = computed<SurveyDockState | undefined>(() => {
        if (currentView.value !== "survey") return undefined;
        const wizard = getWizardRef();
        const survey = wizard?.survey;
        if (!survey) return undefined;
        return {
            isFirstStep: unref(survey.isFirstStep),
            isLastStep: unref(survey.isLastStep),
            editingFromReview: unref(wizard?.editingFromReview) ?? false,
        };
    });

    return {
        currentView,
        canGoBack,
        surveyState,
        startSpeedtest,
        onDockBack,
        onDockForward,
        onDockStart,
        onDockStop,
        onDockNext,
        onDockRetake,
    };
}
