import { ref, computed, watch, type Ref, type ComputedRef } from "vue";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type {
    SurveyConfig,
    SurveyFlowType,
    SurveyStepConfig,
    SurveyFormData,
    SurveySubmission,
} from "@src/types/survey";
import { useSurveyAutoPopulate } from "./useSurveyAutoPopulate";
import { isStepValid, type ValidationErrors, validateStep } from "./useSurveyValidation";

interface SurveyIPData {
    ipInfo: Ref<IPInfo | null>;
    lookedUpIp: Ref<LookedUpIP | null>;
}

/**
 * Survey state machine. Orchestrates step navigation,
 * delegates validation + auto-population to focused helpers.
 */
export function useSurvey(config: SurveyConfig, ipData: SurveyIPData) {
    // ── Restore persisted state ──────────────────────────────────────────
    const STORAGE_KEY = `survey-${config.id}`;
    const saved = typeof localStorage !== "undefined"
        ? JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")
        : null;

    const flowType: Ref<SurveyFlowType | null> = ref(saved?.flowType ?? null);
    const currentStepIndex: Ref<number> = ref(saved?.stepIndex ?? 0);
    const formData: Ref<SurveyFormData> = ref(saved?.formData ?? {});
    const isSubmitting: Ref<boolean> = ref(false);

    // Persist on change
    watch([flowType, currentStepIndex, formData], () => {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                flowType: flowType.value,
                stepIndex: currentStepIndex.value,
                formData: formData.value,
            }));
        }
    }, { deep: true });

    // ── Derived state ─────────────────────────────────────────────────

    /** Steps filtered by the selected flow type. */
    const activeSteps: ComputedRef<SurveyStepConfig[]> = computed(() => {
        const flow = flowType.value;
        return config.steps.filter(
            (s) => !s.flows || !flow || s.flows.includes(flow),
        );
    });

    const currentStep: ComputedRef<SurveyStepConfig> = computed(
        () => activeSteps.value[currentStepIndex.value],
    );

    const progress: ComputedRef<number> = computed(() => {
        const total = activeSteps.value.length;
        return total > 0 ? (currentStepIndex.value + 1) / total : 0;
    });

    const isFirstStep: ComputedRef<boolean> = computed(
        () => currentStepIndex.value === 0,
    );

    const isLastStep: ComputedRef<boolean> = computed(
        () => currentStepIndex.value === activeSteps.value.length - 1,
    );

    const isReviewStep: ComputedRef<boolean> = computed(
        () => currentStep.value?.id === "review",
    );

    const currentErrors: ComputedRef<ValidationErrors> = computed(() =>
        currentStep.value
            ? validateStep(currentStep.value, formData.value)
            : {},
    );

    const canAdvance: ComputedRef<boolean> = computed(
        () => Object.keys(currentErrors.value).length === 0,
    );

    // ── Auto-population ───────────────────────────────────────────────

    const allFields = config.steps.flatMap((s) => s.fields);
    useSurveyAutoPopulate(allFields, formData, ipData);

    // ── Navigation ────────────────────────────────────────────────────

    function nextStep(): boolean {
        if (!canAdvance.value) return false;

        // Capture flow type from the flow-select step
        if (currentStep.value?.id === "flow-select" && formData.value.flowType) {
            flowType.value = formData.value.flowType as SurveyFlowType;
        }

        if (!isLastStep.value) {
            currentStepIndex.value++;
            return true;
        }
        return false;
    }

    function prevStep(): void {
        if (!isFirstStep.value) {
            currentStepIndex.value--;
        }
    }

    function goToStep(index: number): void {
        if (index >= 0 && index < activeSteps.value.length) {
            currentStepIndex.value = index;
        }
    }

    // ── Field access ──────────────────────────────────────────────────

    function setField(fieldId: string, value: unknown): void {
        formData.value[fieldId] = value;
    }

    function getField(fieldId: string): unknown {
        return formData.value[fieldId];
    }

    // ── Submission ────────────────────────────────────────────────────

    function buildSubmission(): SurveySubmission {
        return {
            surveyId: config.id,
            surveyVersion: config.version,
            flowType: flowType.value ?? "home",
            answers: { ...formData.value },
            timestamp: Date.now(),
        };
    }

    function reset(): void {
        flowType.value = null;
        currentStepIndex.value = 0;
        formData.value = {};
        isSubmitting.value = false;
        if (typeof localStorage !== "undefined") {
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    return {
        // State
        flowType,
        currentStepIndex,
        formData,
        isSubmitting,

        // Derived
        activeSteps,
        currentStep,
        progress,
        isFirstStep,
        isLastStep,
        isReviewStep,
        currentErrors,
        canAdvance,

        // Actions
        nextStep,
        prevStep,
        goToStep,
        setField,
        getField,
        buildSubmission,
        reset,
    };
}
