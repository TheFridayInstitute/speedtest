<template>
    <Transition name="pane-slide">
        <ScrollPane v-if="visible">
            <ScrollPaneHeader>{{ title }}</ScrollPaneHeader>
            <div class="px-4 sm:px-6 pb-4 pt-2">
                <Separator class="mb-4" />
                <div class="text-base text-muted-foreground">
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
