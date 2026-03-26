<template>
    <Card class="overflow-hidden">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 class="text-lg font-semibold">Speedtest Servers</h3>
            <Button variant="accent" @click="showAdd = true">Register Server</Button>
        </div>

        <Table class="text-lg">
            <TableHeader>
                <TableRow class="text-base text-muted-foreground">
                    <TableHead>Name</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Host</TableHead>
                    <TableHead>Load</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Heartbeat</TableHead>
                    <TableHead class="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="s in servers" :key="s.serverId">
                    <TableCell class="font-medium">{{ s.name }}</TableCell>
                    <TableCell class="text-base">{{ s.region }}</TableCell>
                    <TableCell class="font-mono text-base">{{ s.host }}</TableCell>
                    <TableCell class="tabular-nums">{{ s.currentLoad }}/{{ s.capacity }}</TableCell>
                    <TableCell>
                        <Badge
                            variant="outline"
                            :class="{
                                'bg-green-500/10 text-green-600': s.status === 'healthy',
                                'bg-yellow-500/10 text-yellow-600': s.status === 'degraded',
                                'bg-red-500/10 text-red-600': s.status === 'offline',
                            }"
                        >
                            {{ s.status }}
                        </Badge>
                    </TableCell>
                    <TableCell class="tabular-nums text-base">
                        {{ formatTime(s.lastHeartbeat) }}
                    </TableCell>
                    <TableCell class="text-right">
                        <Button
                            variant="link"
                            class="text-base text-destructive"
                            @click="$emit('remove', s.serverId)"
                        >
                            Remove
                        </Button>
                    </TableCell>
                </TableRow>
                <TableRow v-if="servers.length === 0">
                    <TableCell colspan="7" class="py-8 text-center text-muted-foreground">
                        {{ isLoading ? 'Loading...' : 'No servers registered' }}
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>

        <!-- Add form -->
        <Transition name="fade">
            <div v-if="showAdd" class="border-t border-border bg-muted/30 px-4 py-3">
                <h4 class="mb-2 text-base font-semibold">Register Server</h4>
                <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Input v-model="newServer.serverId" placeholder="Server ID (slug)" class="text-base" />
                    <Input v-model="newServer.name" placeholder="Display Name" class="text-base" />
                    <Input v-model="newServer.region" placeholder="Region (e.g., us-east-1)" class="text-base" />
                    <Input v-model="newServer.host" placeholder="Host (e.g., speedtest.example.com)" class="text-base" />
                    <Input v-model.number="newServer.port" type="number" placeholder="Port" class="text-base" />
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
import type { ServerHealth } from "@src/stores/useAdminDashboardDataStore";
import {
    Button, Card, Input, Badge,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@mkbabb/glass-ui";

defineProps<{
    servers: ServerHealth[];
    isLoading: boolean;
}>();

const emit = defineEmits<{
    add: [server: { serverId: string; name: string; region: string; host: string; port: number }];
    remove: [serverId: string];
}>();

const showAdd = ref(false);
const newServer = reactive({
    serverId: "",
    name: "",
    region: "us-east-1",
    host: "",
    port: 443,
});

function onAdd() {
    if (newServer.serverId && newServer.host) {
        emit("add", { ...newServer });
        showAdd.value = false;
        Object.assign(newServer, { serverId: "", name: "", region: "us-east-1", host: "", port: 443 });
    }
}

function formatTime(iso: string): string {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString(undefined, {
            month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
        });
    } catch {
        return iso;
    }
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
