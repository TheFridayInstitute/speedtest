<template>
    <Card class="overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">
                Results
                <span class="text-muted-foreground font-normal">({{ total }})</span>
            </h3>
            <Button variant="ghost" @click="$emit('export')">
                Export CSV
            </Button>
        </div>

        <!-- Table -->
        <Table class="text-lg">
            <TableHeader>
                <TableRow class="text-base text-muted-foreground">
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead class="text-right">DL</TableHead>
                    <TableHead class="text-right">UL</TableHead>
                    <TableHead class="text-right">Ping</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow
                    v-for="row in rows"
                    :key="row._id"
                    class="cursor-pointer"
                    @click="$emit('select', row)"
                >
                    <TableCell class="tabular-nums">{{ formatTime(row.timestamp) }}</TableCell>
                    <TableCell>
                        <Badge
                            variant="outline"
                            :class="row.testType === 'traditional' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'"
                        >
                            {{ row.testType }}
                        </Badge>
                    </TableCell>
                    <TableCell>{{ row.survey?.name || '\u2014' }}</TableCell>
                    <TableCell>{{ row.session?.ipInfo?.org || '\u2014' }}</TableCell>
                    <TableCell class="text-right tabular-nums">{{ fmt(row.download) }}</TableCell>
                    <TableCell class="text-right tabular-nums">{{ fmt(row.upload) }}</TableCell>
                    <TableCell class="text-right tabular-nums">{{ fmt(row.ping) }}</TableCell>
                </TableRow>
                <TableRow v-if="rows.length === 0">
                    <TableCell colspan="7" class="py-8 text-center text-muted-foreground">
                        {{ isLoading ? 'Loading...' : 'No results found' }}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <!-- Pagination -->
        <div class="flex items-center justify-between border-t border-border px-4 py-2 text-base text-muted-foreground">
            <span>Page {{ page }} of {{ totalPages }}</span>
            <div class="flex gap-2">
                <Button variant="ghost" size="sm" :disabled="page <= 1" @click="$emit('update:page', page - 1)">
                    Prev
                </Button>
                <Button variant="ghost" size="sm" :disabled="page >= totalPages" @click="$emit('update:page', page + 1)">
                    Next
                </Button>
            </div>
        </div>
    </Card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { DashboardResultRow } from "@src/types/dashboard";
import { Button, Badge, Card } from "@mkbabb/glass-ui";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@components/ui/table";

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
    return `${Math.round(val)}`;
}
</script>
