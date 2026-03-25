<template>
    <BouncyTabs
        :options="computedOptions"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
    />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { BouncyTabs } from "@mkbabb/glass-ui";

const props = withDefaults(
    defineProps<{
        modelValue: string;
        includeAll?: boolean;
    }>(),
    { includeAll: true },
);

defineEmits<{
    "update:modelValue": [value: string];
}>();

const baseOptions = [
    { label: "DL", value: "download" },
    { label: "UL", value: "upload" },
    { label: "Ping", value: "ping" },
    { label: "Jitter", value: "jitter" },
];

const computedOptions = computed(() =>
    props.includeAll
        ? [{ label: "All", value: "all" }, ...baseOptions]
        : baseOptions,
);
</script>
