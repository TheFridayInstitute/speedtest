<script setup lang="ts">
import { computed } from "vue";
import type { DashboardResultRow } from "@src/types/dashboard";
import { Button, Badge, Card, DataTable, type DataTableColumn } from "@mkbabb/glass-ui";

const props = defineProps<{
    rows: DashboardResultRow[];
    total: number;
    page: number;
    pageSize: number;
    isLoading: boolean;
}>();

defineEmits<{
    "update:page": [page: number];
    select: [row: DashboardResultRow];
    export: [];
}>();

function formatTime(ts: string): string {
    if (!ts) return "\u2014";
    return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function fmt(val: number | null): string {
    if (val == null) return "\u2014";
    return `${Math.round(val)}`;
}

const columns = computed<DataTableColumn<DashboardResultRow>[]>(() => [
    {
        key: "timestamp",
        label: "Time",
        class: "tabular-nums",
        formatter: (v) => formatTime(v),
    },
    {
        key: "testType",
        label: "Type",
    },
    {
        key: "survey.name",
        label: "Name",
        formatter: (v) => v || "\u2014",
    },
    {
        key: "session.ipInfo.org",
        label: "Provider",
        formatter: (v) => v || "\u2014",
    },
    {
        key: "download",
        label: "DL",
        align: "right",
        class: "tabular-nums",
        formatter: (v) => fmt(v),
    },
    {
        key: "upload",
        label: "UL",
        align: "right",
        class: "tabular-nums",
        formatter: (v) => fmt(v),
    },
    {
        key: "ping",
        label: "Ping",
        align: "right",
        class: "tabular-nums",
        formatter: (v) => fmt(v),
    },
]);
</script>

<template>
    <Card class="overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">
                Results
                <span class="text-muted-foreground font-normal">({{ total }})</span>
            </h3>
            <Button variant="ghost" @click="$emit('export')">Export CSV</Button>
        </div>

        <DataTable
            :columns="columns"
            :rows="rows"
            :total="total"
            :page="page"
            :page-size="pageSize"
            :is-loading="isLoading"
            class="text-lg"
            @update:page="$emit('update:page', $event)"
            @select="$emit('select', $event)"
        />
    </Card>
</template>
