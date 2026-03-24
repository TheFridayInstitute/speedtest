import { ref, computed, nextTick, type Ref } from "vue";
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

export function useAppNavigation(opts: AppNavigationOptions) {
    const { speedtest, surveyRef, isSpeedtestRunning, isSpeedtestCompleted, onSpeedtestComplete } = opts;

    const currentView = ref<AppView>("speedtest");

    const canGoBack = computed(() => {
        return currentView.value === "survey"
            || currentView.value === "thankyou"
            || currentView.value === "dashboard";
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
        if (currentView.value === "survey") {
            const survey = surveyRef.value?.survey;
            if (survey && !survey.isFirstStep.value) {
                survey.prevStep();
            } else {
                currentView.value = "speedtest";
            }
        } else if (currentView.value === "thankyou") {
            currentView.value = "survey";
        } else if (currentView.value === "dashboard") {
            currentView.value = "speedtest";
        }
    }

    function onDockForward() {
        if (currentView.value === "speedtest") {
            currentView.value = "survey";
        } else if (currentView.value === "survey") {
            const survey = surveyRef.value?.survey;
            if (survey && !survey.isLastStep.value) {
                survey.nextStep();
            } else if (survey?.isLastStep.value) {
                surveyRef.value?.submitFromDock?.();
            }
        } else if (currentView.value === "thankyou") {
            currentView.value = "speedtest";
        }
    }

    function onDockStart() {
        if (currentView.value !== "speedtest") {
            currentView.value = "speedtest";
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
        currentView.value = "speedtest";
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
