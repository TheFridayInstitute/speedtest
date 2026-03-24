<template>
    <Card class="p-4 space-y-3">
        <h3 class="text-lg font-semibold">Filters</h3>

        <div>
            <Label class="text-base text-muted-foreground">From</Label>
            <Input
                type="date"
                class="mt-1 text-lg"
                :model-value="filters.dateFrom"
                @update:model-value="update('dateFrom', String($event))"
            />
        </div>

        <div>
            <Label class="text-base text-muted-foreground">To</Label>
            <Input
                type="date"
                class="mt-1 text-lg"
                :model-value="filters.dateTo"
                @update:model-value="update('dateTo', String($event))"
            />
        </div>

        <div>
            <Label class="text-base text-muted-foreground">Test Type</Label>
            <Select
                :model-value="filters.testType"
                @update:model-value="(v: string) => update('testType', v)"
            >
                <SelectTrigger class="mt-1 text-lg">
                    <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="traditional">Traditional</SelectItem>
                    <SelectItem value="dns">DNS</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <div>
            <Label class="text-base text-muted-foreground">PSU ID</Label>
            <Input
                type="text"
                class="mt-1 text-lg"
                placeholder="e.g., 920"
                :model-value="filters.psuId"
                @update:model-value="update('psuId', String($event))"
            />
        </div>

        <Button
            variant="ghost"
            class="w-full"
            @click="$emit('reset')"
        >
            Clear Filters
        </Button>
    </Card>
</template>

<script setup lang="ts">
import type { DashboardFilters } from "@src/types/dashboard";
import {
    Button, Card, Input, Label,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@mkbabb/glass-ui";

const props = defineProps<{ filters: DashboardFilters }>();

const emit = defineEmits<{
    update: [key: keyof DashboardFilters, value: string];
    reset: [];
}>();

function update(key: keyof DashboardFilters, value: string) {
    emit("update", key, value);
}
</script>
