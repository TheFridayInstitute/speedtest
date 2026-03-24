<template>
    <div class="space-y-4">
        <Card
            v-for="step in reviewSteps"
            :key="step.id"
            class="p-4"
        >
            <div class="mb-2 flex items-center justify-between">
                <h4 class="text-lg">{{ step.title }}</h4>
                <Button
                    variant="ghost"
                    size="sm"
                    @click="$emit('editStep', step.id)"
                >
                    Edit
                </Button>
            </div>
            <dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-lg">
                <template v-for="field in visibleFields(step)" :key="field.id">
                    <dt class="text-muted-foreground">{{ field.label }}</dt>
                    <dd :class="[
                        'font-medium',
                        formatValue(formData[field.id]) !== '\u2014' && 'text-th-accent-opaque font-semibold',
                    ]">{{ formatValue(formData[field.id]) }}</dd>
                </template>
            </dl>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Button, Card } from "@mkbabb/glass-ui";
import type { SurveyStepConfig, SurveyFieldConfig, SurveyFormData } from "@src/types/survey";
import { isFieldVisible } from "./composables/useSurveyValidation";

const props = defineProps<{
    steps: SurveyStepConfig[];
    formData: SurveyFormData;
}>();

defineEmits<{
    editStep: [stepId: string];
}>();

function visibleFields(step: SurveyStepConfig): SurveyFieldConfig[] {
    return step.fields.filter((f) => isFieldVisible(f, props.formData));
}

const reviewSteps = computed(() =>
    props.steps.filter(
        (s) => s.id !== "review" && visibleFields(s).length > 0,
    ),
);

function formatValue(val: unknown): string {
    if (val == null || val === "") return "\u2014";
    if (typeof val === "object" && "formatted" in (val as any)) {
        return (val as any).formatted;
    }
    return String(val);
}
</script>
