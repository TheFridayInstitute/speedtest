<template>
    <span class="shimmer-skeleton" :style="{ width, height }">
        <slot />
    </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
    width?: string;
    height?: string;
}>(), {
    width: "100%",
    height: "1em",
});
</script>

<style scoped>
@keyframes shimmer-slide {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
}

.shimmer-skeleton {
    display: inline-block;
    background: linear-gradient(
        90deg,
        hsl(var(--muted)) 25%,
        hsl(var(--muted-foreground) / 0.3) 50%,
        hsl(var(--muted)) 75%
    );
    background-size: 200% 100%;
    animation: shimmer-slide 1.5s linear infinite;
    border-radius: var(--radius-pill, 9999px);
    opacity: 1;
}
</style>
