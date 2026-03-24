<template>
    <div class="glass rounded-xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">
                IP Lookup Table
                <span class="text-muted-foreground font-normal">({{ total }})</span>
            </h3>
            <div class="flex gap-2">
                <button
                    class="rounded-md bg-muted px-3 py-1.5 text-base font-medium hover:bg-muted/80 transition-colors"
                    @click="$emit('sync')"
                >
                    Sync from Sheets
                </button>
                <button
                    class="rounded-md bg-primary px-3 py-1.5 text-base font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    @click="showAdd = true"
                >
                    Add
                </button>
            </div>
        </div>

        <!-- Search -->
        <div class="border-b border-border px-4 py-2">
            <input
                type="text"
                class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-lg placeholder:text-muted-foreground"
                placeholder="Search by entity, CIDR..."
                :value="search"
                @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
            />
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
            <table class="w-full text-lg">
                <thead>
                    <tr class="border-b border-border text-left text-base text-muted-foreground">
                        <th class="px-4 py-2">CIDR</th>
                        <th class="px-4 py-2">Entity Name</th>
                        <th class="px-4 py-2">Entity ID</th>
                        <th class="px-4 py-2">Type</th>
                        <th class="px-4 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="row in subnets"
                        :key="row._id"
                        class="border-b border-border/50 hover:bg-accent/5 transition-colors"
                    >
                        <td class="px-4 py-2 font-mono text-base">{{ row.cidr }}</td>
                        <td class="px-4 py-2">{{ row.entityName }}</td>
                        <td class="px-4 py-2">{{ row.entityId }}</td>
                        <td class="px-4 py-2 text-base">{{ row.entityType }}</td>
                        <td class="px-4 py-2 text-right">
                            <button
                                class="text-base text-destructive hover:underline"
                                @click="$emit('delete', row._id)"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                    <tr v-if="subnets.length === 0">
                        <td colspan="5" class="px-4 py-8 text-center text-muted-foreground">
                            No subnets found
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Add form (inline modal) -->
        <Transition name="fade">
            <div v-if="showAdd" class="border-t border-border px-4 py-3 bg-muted/30">
                <h4 class="mb-2 text-base font-semibold">Add Subnet</h4>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <input v-model="newSubnet.prefix" placeholder="Prefix (e.g., 152.27.20.0)" class="rounded border border-input bg-background px-2 py-1 text-base" />
                    <input v-model.number="newSubnet.prefixLength" type="number" placeholder="Length" class="rounded border border-input bg-background px-2 py-1 text-base" />
                    <input v-model="newSubnet.entityName" placeholder="Entity Name" class="rounded border border-input bg-background px-2 py-1 text-base" />
                    <input v-model="newSubnet.entityId" placeholder="Entity ID" class="rounded border border-input bg-background px-2 py-1 text-base" />
                    <input v-model="newSubnet.entityType" placeholder="Entity Type" class="rounded border border-input bg-background px-2 py-1 text-base" />
                    <input v-model="newSubnet.networkType" placeholder="Network Type" class="rounded border border-input bg-background px-2 py-1 text-base" />
                </div>
                <div class="mt-2 flex justify-end gap-2">
                    <button class="rounded px-3 py-1 text-base hover:bg-muted" @click="showAdd = false">Cancel</button>
                    <button class="rounded bg-primary px-3 py-1 text-base text-primary-foreground" @click="onAdd">Save</button>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import type { SubnetRow } from "@src/types/dashboard";

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
