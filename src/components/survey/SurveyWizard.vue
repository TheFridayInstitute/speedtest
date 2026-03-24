<template>
    <div class="glass-elevated mx-auto w-full max-w-lg rounded-2xl p-6">
        <!-- Progress bar (accent-colored) -->
        <div class="mb-6 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
                class="h-full rounded-full transition-all duration-panel"
                :style="{
                    width: `${survey.progress.value * 100}%`,
                    background: 'var(--color-accent-opaque)',
                }"
            />
        </div>

        <!-- Step header -->
        <div class="mb-4">
            <h2 class="text-3xl font-semibold">
                {{ survey.currentStep.value?.title }}
            </h2>
            <p
                v-if="survey.currentStep.value?.description"
                class="mt-1 text-lg text-muted-foreground"
            >
                {{ survey.currentStep.value?.description }}
            </p>
        </div>

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

        <!-- Navigation buttons -->
        <div class="mt-6 flex items-center justify-between">
            <button
                v-if="config.skippable"
                class="btn-pill btn-pill-ghost text-lg"
                @click="$emit('skip')"
            >
                Skip
            </button>
            <span v-else />

            <div class="flex gap-2">
                <button
                    v-if="editingFromReview"
                    class="btn-pill btn-pill-glass text-lg"
                    @click="returnToReview"
                >
                    Back to Review
                </button>
                <button
                    v-else-if="!survey.isFirstStep.value"
                    class="btn-pill btn-pill-glass text-lg"
                    @click="survey.prevStep()"
                >
                    Back
                </button>
                <button
                    class="btn-pill btn-pill-accent text-lg"
                    @click="editingFromReview ? returnToReview() : onNext()"
                >
                    {{ editingFromReview ? 'Done' : survey.isLastStep.value ? 'Submit' : 'Next' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { SurveyConfig, SurveySubmission } from "@src/types/survey";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type { GeoCoordinates } from "@src/composables/useGeolocation";
import { useSurvey } from "@src/composables/useSurvey";
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

defineExpose({ survey, submitFromDock });
</script>

<style scoped>
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
