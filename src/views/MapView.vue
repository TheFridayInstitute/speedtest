<template>
    <ExpandableContainer class="h-full">
        <template #default="{ fullscreen }">
            <DashboardMap class="h-full" />
        </template>
    </ExpandableContainer>
</template>

<script setup lang="ts">
import DashboardMap from "@src/components/dashboard/DashboardMap.vue";
import { ExpandableContainer } from "@mkbabb/glass-ui";
</script>
