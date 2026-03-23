<template>
    <Transition name="pane-slide">
        <Card v-if="visible" class="bg-card/75">
            <CardContent class="flex flex-col justify-center p-6">
                <CardTitle class="text-5xl">
                    {{ title }}
                </CardTitle>

                <hr class="my-6 h-0.5 w-full rounded-full bg-foreground/20" />

                <div class="text-base text-muted-foreground">
                    <slot>{{ description }}</slot>
                </div>
            </CardContent>
        </Card>
    </Transition>
</template>

<script setup lang="ts">
import { Card, CardContent, CardTitle } from "@components/ui/card";

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
