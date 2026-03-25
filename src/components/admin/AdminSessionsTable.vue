<template>
    <Card class="overflow-hidden">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">
                Sessions
                <span class="font-normal text-muted-foreground">({{ total }})</span>
            </h3>
            <div class="flex gap-2">
                <Input
                    type="text"
                    class="w-40 text-base"
                    placeholder="Filter by IP..."
                    :model-value="ipFilter"
                    @update:model-value="$emit('update:ipFilter', String($event))"
                />
            </div>
        </div>

        <Table class="text-lg">
            <TableHeader>
                <TableRow class="text-base text-muted-foreground">
                    <TableHead>Created</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>ISP</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead class="text-right">Tests</TableHead>
                    <TableHead>Survey</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="s in sessions" :key="s._id" class="cursor-pointer">
                    <TableCell class="tabular-nums text-base">{{ formatTime(s.createdAt) }}</TableCell>
                    <TableCell class="font-mono text-base">{{ s.clientIp }}</TableCell>
                    <TableCell>{{ s.ipInfo?.org ?? '—' }}</TableCell>
                    <TableCell>{{ s.entityLookup?.entityName ?? '—' }}</TableCell>
                    <TableCell class="text-base">
                        {{ [s.ipInfo?.city, s.ipInfo?.region].filter(Boolean).join(', ') || '—' }}
                    </TableCell>
                    <TableCell class="text-right tabular-nums">{{ s.resultCount }}</TableCell>
                    <TableCell>
                        <Badge
                            variant="outline"
                            :class="{
                                'bg-green-500/10 text-green-600': s.surveyStatus === 'completed',
                                'bg-yellow-500/10 text-yellow-600': s.surveyStatus === 'skipped',
                                'bg-muted/30 text-muted-foreground': s.surveyStatus === 'none',
                            }"
                        >
                            {{ s.surveyStatus }}
                        </Badge>
                    </TableCell>
                </TableRow>
                <TableRow v-if="sessions.length === 0">
                    <TableCell colspan="7" class="py-8 text-center text-muted-foreground">
                        {{ isLoading ? 'Loading...' : 'No sessions found' }}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

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
import type { AdminSession } from "@src/stores/useAdminDashboardDataStore";
import { Button, Card, Input, Badge } from "@mkbabb/glass-ui";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@components/ui/table";

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

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / 50)));

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return iso;
    }
}
</script>
