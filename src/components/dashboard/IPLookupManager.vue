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
        <Dialog :open="showAdd" @update:open="showAdd = $event">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add Subnet</DialogTitle>
                    <DialogDescription>
                        Enter a CIDR-notation IP block to map to an entity.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-3 py-2">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <Label class="text-xs text-muted-foreground">Prefix</Label>
                            <Input v-model="newSubnet.prefix" placeholder="152.27.20.0" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Prefix Length</Label>
                            <Input v-model.number="newSubnet.prefixLength" type="number" placeholder="24" />
                        </div>
                    </div>

                    <!-- CIDR preview -->
                    <div v-if="newSubnet.prefix" class="rounded-lg bg-muted/50 px-3 py-2 font-mono text-sm">
                        {{ newSubnet.prefix }}/{{ newSubnet.prefixLength }}
                    </div>

                    <Separator />

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <Label class="text-xs text-muted-foreground">Entity Name</Label>
                            <Input v-model="newSubnet.entityName" placeholder="Alamance CC" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Entity ID</Label>
                            <Input v-model="newSubnet.entityId" placeholder="CC1" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Entity Type</Label>
                            <Select v-model="newSubnet.entityType">
                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LEA">LEA (School District)</SelectItem>
                                    <SelectItem value="CHARTER">Charter School</SelectItem>
                                    <SelectItem value="Community College">Community College</SelectItem>
                                    <SelectItem value="University">University</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Network Type</Label>
                            <Select v-model="newSubnet.networkType">
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LAN">LAN</SelectItem>
                                    <SelectItem value="WAN">WAN</SelectItem>
                                    <SelectItem value="WiFi">WiFi</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" @click="showAdd = false">Cancel</Button>
                    <Button variant="accent" :disabled="!newSubnet.prefix" @click="onAdd">Add Subnet</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <!-- Sync from Sheets Dialog -->
        <Dialog :open="showSync" @update:open="showSync = $event">
            <DialogContent class="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Sync from Google Sheets</DialogTitle>
                    <DialogDescription>
                        Configure a Google Sheets spreadsheet to sync subnet data from.
                    </DialogDescription>
                </DialogHeader>

                <div class="space-y-3 py-2">
                    <div>
                        <Label class="text-xs text-muted-foreground">Spreadsheet ID</Label>
                        <Input v-model="syncConfig.spreadsheetId" placeholder="1a2b3c4d..." class="font-mono" />
                    </div>
                    <div>
                        <Label class="text-xs text-muted-foreground">Sheet Range</Label>
                        <Input v-model="syncConfig.range" placeholder="Sheet1" />
                    </div>

                    <Separator />
                    <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Column Mapping</p>

                    <div class="grid grid-cols-3 gap-2">
                        <div>
                            <Label class="text-xs text-muted-foreground">Prefix</Label>
                            <Input v-model="syncConfig.mapping.prefix" placeholder="A" class="text-center" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Length</Label>
                            <Input v-model="syncConfig.mapping.prefixLength" placeholder="B" class="text-center" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Net Type</Label>
                            <Input v-model="syncConfig.mapping.networkType" placeholder="C" class="text-center" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Entity Name</Label>
                            <Input v-model="syncConfig.mapping.entityName" placeholder="D" class="text-center" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Entity Type</Label>
                            <Input v-model="syncConfig.mapping.entityType" placeholder="E" class="text-center" />
                        </div>
                        <div>
                            <Label class="text-xs text-muted-foreground">Entity ID</Label>
                            <Input v-model="syncConfig.mapping.entityId" placeholder="F" class="text-center" />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" @click="showSync = false">Cancel</Button>
                    <Button variant="accent" :disabled="!syncConfig.spreadsheetId" @click="onSync">Start Sync</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import type { SubnetRow } from "@src/types/dashboard";
import {
    Button, Card, Input, Label, Separator,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@mkbabb/glass-ui";
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
const showSync = ref(false);
const backendConnected = ref(false);

const newSubnet = reactive({
    prefix: "",
    prefixLength: 24,
    entityName: "",
    entityId: "",
    entityType: "",
    networkType: "LAN",
});

const syncConfig = reactive({
    spreadsheetId: "",
    range: "Sheet1",
    mapping: {
        prefix: "A",
        prefixLength: "B",
        networkType: "C",
        entityName: "D",
        entityType: "E",
        entityId: "F",
    },
});

function onAdd() {
    if (newSubnet.prefix) {
        emit("add", { ...newSubnet });
        showAdd.value = false;
        Object.assign(newSubnet, {
            prefix: "", prefixLength: 24, entityName: "", entityId: "", entityType: "", networkType: "LAN",
        });
    }
}

function onSync() {
    emit("sync");
    showSync.value = false;
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
