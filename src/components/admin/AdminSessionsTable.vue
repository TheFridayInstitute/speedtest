<script setup lang="ts">
import { computed } from "vue";
import type { AdminSession } from "@src/stores/useAdminDashboardDataStore";
import { Card, Input, DataTable, type DataTableColumn } from "@mkbabb/glass-ui";

const props = defineProps<{
    sessions: AdminSession[];
    total: number;
    page: number;
    isLoading: boolean;
    ipFilter: string;
}>();

defineEmits<{
    "update:page": [page: number];
    "update:ipFilter": [value: string];
}>();

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return iso;
    }
}

const columns = computed<DataTableColumn<AdminSession>[]>(() => [
    {
        key: "createdAt",
        label: "Created",
        class: "tabular-nums",
        formatter: (v) => formatTime(v),
    },
    {
        key: "clientIp",
        label: "IP",
        class: "font-mono",
    },
    {
        key: "ipInfo.org",
        label: "ISP",
        formatter: (v) => v ?? "\u2014",
    },
    {
        key: "entityLookup.entityName",
        label: "Entity",
        formatter: (v) => v ?? "\u2014",
    },
    {
        key: "_location",
        label: "Location",
        formatter: (_, row) => {
            const parts = [row.ipInfo?.city, row.ipInfo?.region].filter(Boolean);
            return parts.join(", ") || "\u2014";
        },
    },
    {
        key: "resultCount",
        label: "Tests",
        align: "right",
        class: "tabular-nums",
    },
    {
        key: "surveyStatus",
        label: "Survey",
    },
]);
</script>

<template>
    <Card class="overflow-hidden">
        <div
            class="flex items-center justify-between border-b border-border px-4 py-3"
        >
            <h3 class="text-lg font-semibold">
                Sessions
                <span class="font-normal text-muted-foreground"
                    >({{ total }})</span
                >
            </h3>
            <div class="flex gap-2">
                <Input
                    type="text"
                    class="w-40 text-base"
                    placeholder="Filter by IP..."
                    :model-value="ipFilter"
                    @update:model-value="
                        $emit('update:ipFilter', String($event))
                    "
                />
            </div>
        </div>

        <DataTable
            :columns="columns"
            :rows="sessions"
            :total="total"
            :page="page"
            :page-size="50"
            :is-loading="isLoading"
            class="text-lg"
            @update:page="$emit('update:page', $event)"
        />
    </Card>
</template>
