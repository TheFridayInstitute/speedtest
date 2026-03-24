<template>
    <div class="glass rounded-xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">
                Results
                <span class="text-muted-foreground font-normal">({{ total }})</span>
            </h3>
            <button
                class="text-base text-primary hover:underline"
                @click="$emit('export')"
            >
                Export CSV
            </button>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
            <table class="w-full text-lg">
                <thead>
                    <tr class="border-b border-border text-left text-base text-muted-foreground">
                        <th class="px-4 py-2">Time</th>
                        <th class="px-4 py-2">Type</th>
                        <th class="px-4 py-2">Name</th>
                        <th class="px-4 py-2">Provider</th>
                        <th class="px-4 py-2 text-right">DL</th>
                        <th class="px-4 py-2 text-right">UL</th>
                        <th class="px-4 py-2 text-right">Ping</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="row in rows"
                        :key="row._id"
                        class="border-b border-border/50 hover:bg-accent/5 transition-colors cursor-pointer"
                        @click="$emit('select', row)"
                    >
                        <td class="px-4 py-2 tabular-nums">{{ formatTime(row.timestamp) }}</td>
                        <td class="px-4 py-2">
                            <span
                                class="rounded-full px-2 py-0.5 text-base"
                                :class="row.testType === 'traditional' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'"
                            >
                                {{ row.testType }}
                            </span>
                        </td>
                        <td class="px-4 py-2">{{ row.survey?.name || '\u2014' }}</td>
                        <td class="px-4 py-2">{{ row.session?.ipInfo?.org || '\u2014' }}</td>
                        <td class="px-4 py-2 text-right tabular-nums">{{ fmt(row.download) }}</td>
                        <td class="px-4 py-2 text-right tabular-nums">{{ fmt(row.upload) }}</td>
                        <td class="px-4 py-2 text-right tabular-nums">{{ fmt(row.ping) }}</td>
                    </tr>
                    <tr v-if="rows.length === 0">
                        <td colspan="7" class="px-4 py-8 text-center text-muted-foreground">
                            {{ isLoading ? 'Loading...' : 'No results found' }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="flex items-center justify-between border-t border-border px-4 py-2 text-base text-muted-foreground">
            <span>Page {{ page }} of {{ totalPages }}</span>
            <div class="flex gap-2">
                <button
                    :disabled="page <= 1"
                    class="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
                    @click="$emit('update:page', page - 1)"
                >
                    Prev
                </button>
                <button
                    :disabled="page >= totalPages"
                    class="rounded px-2 py-1 hover:bg-muted disabled:opacity-40"
                    @click="$emit('update:page', page + 1)"
                >
                    Next
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardResultRow } from "@src/types/dashboard";

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

const totalPages = computed(() =>
    Math.max(1, Math.ceil(props.total / props.pageSize)),
);

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
    return val.toFixed(1);
}
</script>
