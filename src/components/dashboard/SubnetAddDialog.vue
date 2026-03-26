<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
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
                <Button variant="ghost" @click="$emit('update:open', false)">Cancel</Button>
                <Button variant="accent" :disabled="!newSubnet.prefix" @click="onAdd">Add Subnet</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import {
    Button, Input, Label, Separator,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@mkbabb/glass-ui";

defineProps<{
    open: boolean;
}>();

const emit = defineEmits<{
    "update:open": [value: boolean];
    add: [data: { prefix: string; prefixLength: number; entityName: string; entityId: string; entityType: string; networkType: string }];
}>();

const newSubnet = reactive({
    prefix: "",
    prefixLength: 24,
    entityName: "",
    entityId: "",
    entityType: "",
    networkType: "LAN",
});

function onAdd() {
    if (newSubnet.prefix) {
        emit("add", { ...newSubnet });
        emit("update:open", false);
        Object.assign(newSubnet, {
            prefix: "", prefixLength: 24, entityName: "", entityId: "", entityType: "", networkType: "LAN",
        });
    }
}
</script>
