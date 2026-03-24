<template>
    <Transition name="pane-slide">
        <ScrollPane v-if="visible">
            <ScrollPaneHeader>{{ title }}</ScrollPaneHeader>
            <div class="px-4 sm:px-6 pb-4 pt-2">
                <Separator class="mb-4" />
                <div class="text-xl text-muted-foreground">
                    <slot>{{ description }}</slot>
                </div>
            </div>
        </ScrollPane>
    </Transition>
</template>

<script setup lang="ts">
import { ScrollPane, ScrollPaneHeader } from "@mkbabb/glass-ui";
import { Separator } from "@mkbabb/glass-ui";

withDefaults(
    defineProps<{
        title: string;
        description?: string;
        visible: boolean;
    }>(),
    {
        description: "",
    },
);

defineEmits<{
    start: [];
}>();
</script>

<style scoped>
.pane-slide-enter-active,
.pane-slide-leave-active {
    transition:
        opacity var(--duration-panel) var(--ease-standard),
        max-height var(--duration-panel) var(--ease-standard);
    overflow: hidden;
}
.pane-slide-enter-from,
.pane-slide-leave-to {
    opacity: 0;
    max-height: 0;
}
.pane-slide-enter-to,
.pane-slide-leave-from {
    opacity: 1;
    max-height: 500px;
}
</style>
