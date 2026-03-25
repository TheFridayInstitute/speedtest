import { computed, nextTick, type Ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import type { UseSpeedtestReturn } from "./useSpeedtest";

export type AppView = "speedtest" | "survey" | "dashboard" | "thankyou";

interface AppNavigationOptions {
    speedtest: UseSpeedtestReturn;
    surveyRef: Ref<any>;
    isSpeedtestRunning: Ref<boolean>;
    isSpeedtestCompleted: Ref<boolean>;
    onSpeedtestComplete: (results: SpeedtestResults) => void;
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
    const { speedtest, surveyRef, isSpeedtestRunning, isSpeedtestCompleted, onSpeedtestComplete } = opts;
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

    function onDockBack() {
        const view = currentView.value;
        if (view === "survey") {
            const survey = surveyRef.value?.surveyRef?.survey ?? surveyRef.value?.survey;
            if (survey && !survey.isFirstStep.value) {
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
            const survey = surveyRef.value?.surveyRef?.survey ?? surveyRef.value?.survey;
            if (survey && !survey.isLastStep.value) {
                survey.nextStep();
            } else if (survey?.isLastStep.value) {
                const wizard = surveyRef.value?.surveyRef ?? surveyRef.value;
                wizard?.submitFromDock?.();
            }
        } else if (view === "thankyou") {
            router.push({ name: "speedtest" });
        }
    }

    function onDockStart() {
        if (currentView.value !== "speedtest") {
            router.push({ name: "speedtest" });
        }
        nextTick(() => startSpeedtest());
    }

    function onDockStop() {
        speedtest.abort();
        isSpeedtestCompleted.value = false;
    }

    function onDockNext() {
        if (isSpeedtestCompleted.value) {
            onSpeedtestComplete(parseResults());
        }
    }

    function onDockRetake() {
        isSpeedtestCompleted.value = false;
        isSpeedtestRunning.value = false;
        router.push({ name: "speedtest" });
        nextTick(() => startSpeedtest());
    }

    return {
        currentView,
        canGoBack,
        startSpeedtest,
        onDockBack,
        onDockForward,
        onDockStart,
        onDockStop,
        onDockNext,
        onDockRetake,
    };
}
