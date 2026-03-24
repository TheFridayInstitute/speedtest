<template>
    <Card class="bg-card/75 mx-auto w-full max-w-lg">
        <CardContent class="flex flex-col justify-center p-6">
            <CardTitle class="text-5xl">
                🎉 Thank you!
            </CardTitle>

            <hr class="my-6 h-0.5 w-full rounded-full bg-foreground/20" />

            <div class="text-xl text-muted-foreground">
                Your response has been recorded. Your feedback helps us improve
                internet connectivity for everyone.
            </div>

            <div class="mt-8 flex items-center gap-3">
                <button
                    class="btn-pill btn-pill-ghost text-base"
                    @click="$emit('edit')"
                >
                    Edit Response
                </button>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { Card, CardContent, CardTitle } from "@components/ui/card";

defineEmits<{
    edit: [];
}>();
</script>
