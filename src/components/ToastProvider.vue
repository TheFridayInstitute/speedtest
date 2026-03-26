<template>
    <Teleport to="html">
        <Toaster
            :toast-options="{
                classes: {
                    toast: 'bg-card/90 backdrop-blur-md text-foreground border border-border/50 rounded-2xl px-6 py-4 grid grid-cols-1 gap-1.5 shadow-lg lg:w-96 w-full font-sans',
                    title: 'text-2xl font-semibold text-foreground',
                    description: 'text-base font-mono text-muted-foreground',
                    actionButton: '',
                    cancelButton: '',
                    closeButton: '',
                },
            }"
            :theme="isDark ? 'dark' : 'light'"
        />
    </Teleport>
</template>

<script setup lang="ts">
import { Toaster } from "vue-sonner";

defineProps<{
    isDark: boolean;
}>();
</script>
