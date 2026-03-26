<template>
    <Card class="overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-base font-semibold">
                IP Lookup Table
                <span class="font-normal text-muted-foreground">({{ total }})</span>
            </h3>
            <div class="flex gap-2">
                <Button
                    variant="glass"
                    size="sm"
                    :disabled="!backendConnected"
                    @click="showSync = true"
                >
                    {{ backendConnected ? 'Sync from Sheets' : 'Backend offline' }}
                </Button>
                <Button variant="accent" size="sm" @click="showAdd = true">Add</Button>
            </div>
        </div>

        <!-- Search -->
        <div class="border-b border-border px-4 py-2">
            <Input
                type="text"
                placeholder="Search by entity, CIDR..."
                :model-value="search"
                @update:model-value="$emit('update:search', String($event))"
            />
        </div>

        <!-- Table -->
        <Table>
            <TableHeader>
                <TableRow class="text-sm text-muted-foreground">
                    <TableHead>CIDR</TableHead>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="row in subnets" :key="row._id">
                    <TableCell class="font-mono text-sm">{{ row.cidr }}</TableCell>
                    <TableCell class="text-sm">{{ row.entityName }}</TableCell>
                    <TableCell class="text-sm">{{ row.entityId }}</TableCell>
                    <TableCell class="text-sm">{{ row.entityType }}</TableCell>
                    <TableCell class="text-right">
                        <Button variant="link" class="text-sm text-destructive" @click="$emit('delete', row._id)">
                            Delete
                        </Button>
                    </TableCell>
                </TableRow>
                <TableRow v-if="subnets.length === 0">
                    <TableCell colspan="5" class="py-8 text-center text-sm text-muted-foreground">
                        No subnets found
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <!-- Add Subnet Dialog -->
        <SubnetAddDialog
            :open="showAdd"
            @update:open="showAdd = $event"
            @add="onAdd"
        />

        <!-- Sync from Sheets Dialog -->
        <SubnetSyncDialog
            :open="showSync"
            :backend-connected="backendConnected"
            @update:open="showSync = $event"
            @sync="onSync"
        />
    </Card>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import type { SubnetRow } from "@src/types/dashboard";
import {
    Button, Card, Input,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@mkbabb/glass-ui";
import SubnetAddDialog from "./SubnetAddDialog.vue";
import SubnetSyncDialog from "./SubnetSyncDialog.vue";

defineProps<{
    subnets: SubnetRow[];
    total: number;
    search: string;
}>();

const emit = defineEmits<{
    "update:search": [value: string];
    add: [data: { prefix: string; prefixLength: number; entityName: string; entityId: string; entityType: string; networkType: string }];
    delete: [id: string];
    sync: [];
}>();

const showAdd = ref(false);
const showSync = ref(false);
const backendConnected = ref(false);

function onAdd(data: any) {
    emit("add", data);
}

function onSync() {
    emit("sync");
}

onMounted(async () => {
    try {
        const res = await fetch("/api");
        backendConnected.value = res.ok;
    } catch {
        backendConnected.value = false;
    }
});
</script>
