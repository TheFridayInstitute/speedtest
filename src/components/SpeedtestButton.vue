<template>
    <Button
        variant="accent"
        size="lg"
        class="px-8 py-3 text-lg"
        @click="handleClick"
    >
        {{ label }}
    </Button>
</template>

<script setup lang="ts">
import { Button } from "@components/ui/button";

withDefaults(
    defineProps<{
        label?: string;
        isRunning?: boolean;
    }>(),
    {
        label: "Start",
        isRunning: false,
    },
);

const emit = defineEmits<{
    click: [event: MouseEvent];
}>();

function handleClick(ev: MouseEvent) {
    emit("click", ev);
}
</script>
