<template>
    <ThankYou @edit="router.push({ name: 'survey' })" />
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import ThankYou from "@src/components/survey/ThankYou.vue";

const router = useRouter();
</script>
