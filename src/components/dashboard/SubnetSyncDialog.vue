<template>
    <Dialog :open="open" @update:open="$emit('update:open', $event)">
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
                <Button variant="ghost" @click="$emit('update:open', false)">Cancel</Button>
                <Button variant="accent" :disabled="!syncConfig.spreadsheetId" @click="onSync">Start Sync</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<script setup lang="ts">
import { reactive } from "vue";
import {
    Button, Input, Label, Separator,
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@mkbabb/glass-ui";

defineProps<{
    open: boolean;
    backendConnected: boolean;
}>();

const emit = defineEmits<{
    "update:open": [value: boolean];
    sync: [config: { spreadsheetId: string; range: string; mapping: Record<string, string> }];
}>();

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

function onSync() {
    emit("sync", { ...syncConfig, mapping: { ...syncConfig.mapping } });
    emit("update:open", false);
}
</script>
