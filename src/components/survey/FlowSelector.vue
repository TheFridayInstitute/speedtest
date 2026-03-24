<template>
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <button
            v-for="option in options"
            :key="option.value"
            class="glass flex flex-col items-center gap-3 rounded-xl p-6 transition-all duration-normal hover:shadow-glass-elevated"
            :class="{
                'ring-2 ring-primary shadow-glass-elevated': modelValue === option.value,
                'opacity-70': modelValue && modelValue !== option.value,
            }"
            @click="$emit('update:modelValue', option.value)"
        >
            <component :is="option.icon" class="h-8 w-8" />
            <span class="text-2xl font-medium">{{ option.label }}</span>
            <span class="text-lg text-muted-foreground">{{ option.description }}</span>
        </button>
    </div>
</template>

<script setup lang="ts">
import { School, Home } from "lucide-vue-next";
import { markRaw } from "vue";

defineProps<{
    modelValue: string | null;
}>();

defineEmits<{
    "update:modelValue": [value: string];
}>();

const options = [
    {
        value: "school",
        label: "School",
        description: "I'm testing at a school",
        icon: markRaw(School),
    },
    {
        value: "home",
        label: "Home",
        description: "I'm testing from home",
        icon: markRaw(Home),
    },
];
</script>
