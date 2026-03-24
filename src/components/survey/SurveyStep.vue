<template>
    <div class="grid grid-cols-2 gap-4">
        <SurveyField
            v-for="field in visibleFields"
            :key="field.id"
            :field="field"
            :model-value="formData[field.id]"
            :error="errors[field.id]"
            @update:model-value="$emit('update:field', field.id, $event)"
        >
            <template v-if="field.type === 'address'" #address>
                <AddressAutocomplete
                    :model-value="(formData[field.id] as any) ?? null"
                    :placeholder="field.placeholder"
                    :bias="geoBias"
                    @update:model-value="$emit('update:field', field.id, $event)"
                />
            </template>
        </SurveyField>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SurveyStepConfig, SurveyFormData } from "@src/types/survey";
import type { ValidationErrors } from "@src/composables/useSurveyValidation";
import { isFieldVisible } from "@src/composables/useSurveyValidation";
import type { GeoCoordinates } from "@src/composables/useGeolocation";
import SurveyField from "./SurveyField.vue";
import AddressAutocomplete from "./AddressAutocomplete.vue";

const props = defineProps<{
    step: SurveyStepConfig;
    formData: SurveyFormData;
    errors: ValidationErrors;
    geoBias?: GeoCoordinates | null;
}>();

defineEmits<{
    "update:field": [fieldId: string, value: unknown];
}>();

const visibleFields = computed(() =>
    props.step.fields.filter((f) => isFieldVisible(f, props.formData)),
);
</script>
