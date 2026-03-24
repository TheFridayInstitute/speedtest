<template>
    <ScrollPane class="mx-auto w-full max-w-lg">
        <!-- Progress bar (accent-colored) -->
        <div class="sticky top-0 z-[2] h-1 w-full overflow-hidden bg-muted">
            <div
                class="h-full transition-all duration-panel"
                :style="{
                    width: `${survey.progress.value * 100}%`,
                    background: 'var(--color-accent-opaque)',
                }"
            />
        </div>

        <ScrollPaneHeader :description="survey.currentStep.value?.description">
            {{ survey.currentStep.value?.title }}
        </ScrollPaneHeader>

        <div class="flex flex-col gap-4 px-4 sm:px-6 pb-4 pt-2">
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
        <div class="mt-2 flex items-center justify-between">
            <Button
                v-if="config.skippable"
                variant="ghost"
                class="text-lg"
                @click="$emit('skip')"
            >
                Skip
            </Button>
            <span v-else />

            <div class="flex gap-2">
                <Button
                    v-if="editingFromReview"
                    variant="glass"
                    class="text-lg"
                    @click="returnToReview"
                >
                    Back to Review
                </Button>
                <Button
                    v-else-if="!survey.isFirstStep.value"
                    variant="glass"
                    class="text-lg"
                    @click="survey.prevStep()"
                >
                    Back
                </Button>
                <Button
                    variant="accent"
                    class="text-lg"
                    @click="editingFromReview ? returnToReview() : onNext()"
                >
                    {{ editingFromReview ? 'Done' : survey.isLastStep.value ? 'Submit' : 'Next' }}
                </Button>
            </div>
        </div>
        </div>
    </ScrollPane>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import type { SurveyConfig, SurveySubmission } from "@src/types/survey";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type { GeoCoordinates } from "@src/composables/useGeolocation";
import { useSurvey } from "./composables/useSurvey";
import { Button, ScrollPane, ScrollPaneHeader } from "@mkbabb/glass-ui";
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
