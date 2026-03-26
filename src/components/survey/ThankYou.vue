<template>
    <ScrollPane class="mx-auto w-full max-w-lg">
        <ScrollPaneHeader>Thank you! 🎉</ScrollPaneHeader>
        <div class="px-4 sm:px-6 pb-4 pt-2">
            <Separator class="mb-4" />
            <div class="text-xl text-muted-foreground">
                Your response has been recorded. Your feedback helps us improve
                internet connectivity for everyone.
            </div>

            <div class="mt-8 flex items-center gap-3">
                <Button
                    variant="ghost"
                    @click="$emit('edit')"
                >
                    Edit Response
                </Button>
            </div>
        </div>
    </ScrollPane>
</template>

<script setup lang="ts">
import { Button, ScrollPane, ScrollPaneHeader, Separator } from "@mkbabb/glass-ui";

defineEmits<{
    edit: [];
}>();
</script>
