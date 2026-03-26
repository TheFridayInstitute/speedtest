<template>
    <div>
        <Popover>
            <PopoverTrigger>
                <Button
                    variant="glass"
                    size="icon"
                    class="h-9 w-9 text-lg text-muted-foreground hover:scale-105 hover:text-foreground"
                    aria-label="Settings"
                >
                    i
                </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" class="w-72">
                <div class="flex items-center justify-between">
                    <span class="text-base uppercase tracking-wider text-muted-foreground">Theme</span>
                    <DarkModeToggle class="h-5 w-5" />
                </div>
                <template v-if="resolvedServers.length > 0">
                    <Separator class="my-3" />
                    <section>
                        <h4 class="text-base uppercase tracking-wider text-muted-foreground">Server</h4>
                        <Select
                            :model-value="resolvedActiveServerId ?? undefined"
                            @update:model-value="onSelectServer"
                        >
                            <SelectTrigger class="mt-1 text-lg">
                                <SelectValue placeholder="Select server" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="server in resolvedServers" :key="server.id" :value="server.id">
                                    {{ server.config.name }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </section>
                </template>
                <Separator v-if="resolvedClientIp" class="my-3" />
                <section v-if="resolvedClientIp">
                    <h4 class="text-base uppercase tracking-wider text-muted-foreground">Connection</h4>
                    <p class="mt-1 font-mono text-lg">{{ resolvedClientIp }}</p>
                    <p v-if="resolvedIpInfo?.org" class="mt-0.5 text-lg italic text-muted-foreground">{{ resolvedIpInfo.org }}</p>
                </section>
                <Separator v-if="resolvedLookedUpIp?.row && resolvedClientIp" class="my-3" />
                <section v-if="resolvedLookedUpIp?.row">
                    <h4 class="text-base uppercase tracking-wider text-muted-foreground">Entity</h4>
                    <p class="mt-1 text-lg text-th-accent">{{ resolvedLookedUpIp.row["Entity Name"] }}</p>
                    <p class="mt-0.5 font-mono text-base text-muted-foreground">{{ resolvedLookedUpIp.row["Entity ID"] }}</p>
                </section>
            </PopoverContent>
        </Popover>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import {
    Popover, PopoverTrigger, PopoverContent,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Button, Separator,
} from "@mkbabb/glass-ui";
import { DarkModeToggle } from "@mkbabb/glass-ui";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type { ManagedServer } from "@src/composables/useServerManager";
import { ServerManagerKey, IPInfoKey } from "@src/composables/injectionKeys";

const props = withDefaults(
    defineProps<{
        servers?: ManagedServer[];
        activeServerId?: string | null;
        clientIp?: string;
        ipInfo?: IPInfo | null;
        lookedUpIp?: LookedUpIP | null;
    }>(),
    {
        servers: () => [],
        activeServerId: null,
        clientIp: "",
        ipInfo: null,
        lookedUpIp: null,
    },
);

const emit = defineEmits<{
    selectServer: [id: string];
}>();

// Inject from App.vue when props aren't provided (e.g. on dashboard routes)
const injectedServerManager = inject(ServerManagerKey, null as any);
const injectedIpInfo = inject(IPInfoKey, null as any);

const resolvedServers = computed(() =>
    props.servers.length > 0 ? props.servers : (injectedServerManager?.traditionalServers?.value ?? []),
);
const resolvedActiveServerId = computed(() =>
    props.activeServerId ?? injectedServerManager?.activeServer?.value?.id ?? null,
);
const resolvedClientIp = computed(() =>
    props.clientIp || injectedIpInfo?.clientIp?.value || "",
);
const resolvedIpInfo = computed(() =>
    props.ipInfo ?? injectedIpInfo?.ipInfo?.value ?? null,
);
const resolvedLookedUpIp = computed(() =>
    props.lookedUpIp ?? injectedIpInfo?.lookedUpIp?.value ?? null,
);

function onSelectServer(id: string) {
    emit("selectServer", id);
    injectedServerManager?.setActiveServer?.(id);
}
</script>
