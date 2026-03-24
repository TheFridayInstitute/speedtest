<template>
    <Teleport to="html">
        <Toaster
            :toast-options="{
                classes: {
                    toast: 'bg-background text-background rounded-md px-6 py-4 grid grid-cols-1 gap-2 shadow-lg h-32 lg:w-96 w-full',
                    title: 'text-3xl text-th-accent',
                    description: 'font-normal text-md font-mono',
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
