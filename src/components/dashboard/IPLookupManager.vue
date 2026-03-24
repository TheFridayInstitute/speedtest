<template>
    <Card class="overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">
                IP Lookup Table
                <span class="text-muted-foreground font-normal">({{ total }})</span>
            </h3>
            <div class="flex gap-2">
                <Button variant="glass" @click="$emit('sync')">Sync from Sheets</Button>
                <Button variant="accent" @click="showAdd = true">Add</Button>
            </div>
        </div>

        <!-- Search -->
        <div class="border-b border-border px-4 py-2">
            <Input
                type="text"
                class="text-lg"
                placeholder="Search by entity, CIDR..."
                :model-value="search"
                @update:model-value="$emit('update:search', String($event))"
            />
        </div>

        <!-- Table -->
        <Table class="text-lg">
            <TableHeader>
                <TableRow class="text-base text-muted-foreground">
                    <TableHead>CIDR</TableHead>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="row in subnets" :key="row._id">
                    <TableCell class="font-mono text-base">{{ row.cidr }}</TableCell>
                    <TableCell>{{ row.entityName }}</TableCell>
                    <TableCell>{{ row.entityId }}</TableCell>
                    <TableCell class="text-base">{{ row.entityType }}</TableCell>
                    <TableCell class="text-right">
                        <Button
                            variant="link"
                            class="text-destructive text-base"
                            @click="$emit('delete', row._id)"
                        >
                            Delete
                        </Button>
                    </TableCell>
                </TableRow>
                <TableRow v-if="subnets.length === 0">
                    <TableCell colspan="5" class="py-8 text-center text-muted-foreground">
                        No subnets found
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <!-- Add form (inline modal) -->
        <Transition name="fade">
            <div v-if="showAdd" class="border-t border-border px-4 py-3 bg-muted/30">
                <h4 class="mb-2 text-base font-semibold">Add Subnet</h4>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Input v-model="newSubnet.prefix" placeholder="Prefix (e.g., 152.27.20.0)" class="text-base" />
                    <Input v-model="newSubnet.prefixLength" type="number" placeholder="Length" class="text-base" />
                    <Input v-model="newSubnet.entityName" placeholder="Entity Name" class="text-base" />
                    <Input v-model="newSubnet.entityId" placeholder="Entity ID" class="text-base" />
                    <Input v-model="newSubnet.entityType" placeholder="Entity Type" class="text-base" />
                    <Input v-model="newSubnet.networkType" placeholder="Network Type" class="text-base" />
                </div>
                <div class="mt-2 flex justify-end gap-2">
                    <Button variant="ghost" @click="showAdd = false">Cancel</Button>
                    <Button variant="accent" @click="onAdd">Save</Button>
                </div>
            </div>
        </Transition>
    </Card>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import type { SubnetRow } from "@src/types/dashboard";
import { Button, Card, Input } from "@mkbabb/glass-ui";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@components/ui/table";

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
const newSubnet = reactive({
    prefix: "",
    prefixLength: 24,
    entityName: "",
    entityId: "",
    entityType: "",
    networkType: "LAN",
});

function onAdd() {
    emit("add", { ...newSubnet });
    showAdd.value = false;
    Object.assign(newSubnet, {
        prefix: "", prefixLength: 24, entityName: "", entityId: "", entityType: "", networkType: "LAN",
    });
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
