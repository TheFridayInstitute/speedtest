<template>
    <div :class="{ 'col-span-2': field.colSpan === 2 }">
        <Label :for="field.id" class="mb-1.5 block text-lg font-medium">
            {{ field.label }}
        </Label>

        <!-- Text / Email / Tel / Readonly -->
        <Input
            v-if="isTextLike"
            :id="field.id"
            type="text"
            :class="{ 'opacity-60': field.type === 'readonly' && !field.editable }"
            :placeholder="field.placeholder"
            :disabled="field.type === 'readonly' && !field.editable"
            :model-value="String(modelValue ?? '')"
            @update:model-value="emit('update:modelValue', $event)"
        />

        <!-- Textarea -->
        <Textarea
            v-else-if="field.type === 'textarea'"
            :id="field.id"
            class="min-h-20 py-2.5"
            :placeholder="field.placeholder"
            :model-value="String(modelValue ?? '')"
            @update:model-value="emit('update:modelValue', $event)"
        />

        <!-- Select (proper reka-ui component) -->
        <Select
            v-else-if="field.type === 'select'"
            :model-value="(modelValue as string) ?? ''"
            @update:model-value="(v: any) => $emit('update:modelValue', v)"
        >
            <SelectTrigger :id="field.id">
                <SelectValue :placeholder="field.placeholder ?? 'Select...'" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem
                    v-for="opt in field.options"
                    :key="opt.value"
                    :value="opt.value"
                >
                    {{ opt.label }}
                </SelectItem>
            </SelectContent>
        </Select>

        <!-- Radio (pill chips) -->
        <div v-else-if="field.type === 'radio'" class="flex flex-wrap gap-2 pt-1">
            <label
                v-for="opt in field.options"
                :key="opt.value"
                class="cursor-pointer rounded-full px-3 py-1.5 text-lg transition-all"
                :class="modelValue === opt.value
                    ? 'bg-th-accent-opaque text-foreground font-medium'
                    : 'glass hover:bg-accent/10'"
            >
                <input
                    type="radio"
                    :name="field.id"
                    :value="opt.value"
                    :checked="modelValue === opt.value"
                    class="sr-only"
                    @change="$emit('update:modelValue', opt.value)"
                />
                {{ opt.label }}
            </label>
        </div>

        <!-- Checkbox -->
        <div
            v-else-if="field.type === 'checkbox'"
            class="flex cursor-pointer items-center gap-2 pt-1"
            @click="emit('update:modelValue', !modelValue)"
        >
            <Checkbox
                :checked="!!modelValue"
                @update:checked="emit('update:modelValue', $event)"
            />
            <Label class="text-lg cursor-pointer">{{ field.placeholder }}</Label>
        </div>

        <!-- Address (slot for AddressAutocomplete) -->
        <slot v-else-if="field.type === 'address'" name="address" />

        <!-- Description -->
        <p v-if="field.description" class="mt-1 text-base text-muted-foreground">
            {{ field.description }}
        </p>

        <!-- Error -->
        <p v-if="error" class="mt-1 text-base text-destructive">
            {{ error }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SurveyFieldConfig } from "@src/types/survey";
import {
    Input, Textarea, Checkbox, Label,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@mkbabb/glass-ui";

const props = defineProps<{
    field: SurveyFieldConfig;
    modelValue: unknown;
    error?: string;
}>();

const emit = defineEmits<{
    "update:modelValue": [value: unknown];
}>();

const isTextLike = computed(() =>
    ["text", "number", "email", "tel", "readonly"].includes(props.field.type),
);
</script>
