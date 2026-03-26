<template>
    <ScrollPane class="mx-auto w-full max-w-lg overscroll-contain">
        <!-- Progress bar (accent-colored) -->
        <div class="sticky top-0 z-[var(--z-base)] h-1 w-full overflow-hidden bg-muted">
            <div
                class="h-full transition-all duration-panel"
                :style="{
                    width: `${survey.progress.value * 100}%`,
                    background: 'var(--th-accent-opaque)',
                }"
            />
        </div>

        <ScrollPaneHeader :description="survey.currentStep.value?.description" class="survey-header">
            {{ survey.currentStep.value?.title }}
        </ScrollPaneHeader>

        <div class="flex flex-col gap-4 px-4 sm:px-6 pb-[var(--dock-footer-space)] pt-2">
        <!-- Step content -->
        <Transition name="pane-swap" mode="out-in">
            <div :key="survey.currentStep.value?.id">
                <!-- Flow selection step -->
                <FlowSelector
                    v-if="survey.currentStep.value?.id === 'flow-select'"
                    :model-value="(survey.formData.value.flowType as string) ?? null"
                    @update:model-value="survey.setField('flowType', $event)"
                />

                <!-- Review step -->
                <SurveyReview
                    v-else-if="survey.isReviewStep.value"
                    :steps="survey.activeSteps.value"
                    :form-data="survey.formData.value"
                    @edit-step="onEditStep"
                />

                <!-- Normal step -->
                <SurveyStep
                    v-else-if="survey.currentStep.value"
                    :step="survey.currentStep.value"
                    :form-data="survey.formData.value"
                    :errors="survey.currentErrors.value"
                    :geo-bias="geoBias"
                    @update:field="survey.setField"
                />
            </div>
        </Transition>

        <!-- Navigation is handled by the dock bar -->
        </div>
    </ScrollPane>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { SurveyConfig, SurveySubmission } from "@src/types/survey";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type { GeoCoordinates } from "@src/composables/useGeolocation";
import { useSurvey } from "./composables/useSurvey";
import { ScrollPane, ScrollPaneHeader } from "@mkbabb/glass-ui";
import FlowSelector from "./FlowSelector.vue";
import SurveyStep from "./SurveyStep.vue";
import SurveyReview from "./SurveyReview.vue";

/** When editing from review, track the return index. */
const editingFromReview = ref(false);

const props = defineProps<{
    config: SurveyConfig;
    ipInfo: IPInfo | null;
    lookedUpIp: LookedUpIP | null;
    geoBias?: GeoCoordinates | null;
}>();

const emit = defineEmits<{
    submit: [data: SurveySubmission];
    skip: [];
}>();

const survey = useSurvey(props.config, {
    ipInfo: computed(() => props.ipInfo),
    lookedUpIp: computed(() => props.lookedUpIp),
});

function onNext() {
    if (survey.isLastStep.value) {
        emit("submit", survey.buildSubmission());
    } else {
        survey.nextStep();
    }
}

function onEditStep(stepId: string) {
    const idx = survey.activeSteps.value.findIndex((s) => s.id === stepId);
    if (idx >= 0) {
        editingFromReview.value = true;
        survey.goToStep(idx);
    }
}

/** Return to review step after editing. */
function returnToReview() {
    editingFromReview.value = false;
    const reviewIdx = survey.activeSteps.value.findIndex((s) => s.id === "review");
    if (reviewIdx >= 0) survey.goToStep(reviewIdx);
}

function submitFromDock() {
    emit("submit", survey.buildSubmission());
}

const isSkippable = computed(() => !!props.config.skippable);

defineExpose({ survey, submitFromDock, editingFromReview, returnToReview, isSkippable });
</script>

<style scoped>
/* ── Survey header: one step smaller than default pane title ── */
.survey-header :deep(.pane-header-title) {
    font-size: var(--type-display-1, 2.618rem);
}

@media (min-width: 640px) {
    .survey-header :deep(.pane-header-title) {
        font-size: var(--type-display-2, 3.33rem);
    }
}

.pane-swap-enter-active,
.pane-swap-leave-active {
    transition:
        opacity var(--duration-normal, 0.25s) var(--ease-standard, ease),
        transform var(--duration-normal, 0.25s) var(--ease-standard, ease);
}
.pane-swap-enter-from {
    opacity: 0;
    transform: translateX(12px);
}
.pane-swap-leave-to {
    opacity: 0;
    transform: translateX(-12px);
}
</style>
