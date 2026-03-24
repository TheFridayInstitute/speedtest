<template>
    <div class="sticky top-0 z-header flex w-full items-center justify-between p-4">
        <!-- Info popover (top-left) -->
        <Popover>
            <PopoverTrigger class="pointer-events-auto">
                <button
                    class="glass flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-lg text-muted-foreground transition-all hover:scale-105 hover:text-foreground active:scale-95"
                    aria-label="Connection info"
                >
                    i
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="bottom"
                align="start"
                class="pointer-events-auto w-72"
            >
                <!-- Server section -->
                <section>
                    <h4 class="text-base uppercase tracking-wider text-muted-foreground">Server</h4>
                    <Select
                        :model-value="activeServerId ?? undefined"
                        @update:model-value="(id: string) => emit('selectServer', id)"
                    >
                        <SelectTrigger class="mt-1 font-mono text-lg">
                            <SelectValue placeholder="Select server" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem
                                v-for="server in servers"
                                :key="server.id"
                                :value="server.id"
                                class="font-mono"
                            >
                                {{ server.config.name }}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </section>

                <hr v-if="clientIp" class="my-3 border-border" />

                <!-- Connection section -->
                <section v-if="clientIp">
                    <h4 class="text-base uppercase tracking-wider text-muted-foreground">Connection</h4>
                    <p class="mt-1 font-mono text-lg">{{ clientIp }}</p>
                    <p v-if="ipInfo?.org" class="mt-0.5 text-lg italic text-muted-foreground">
                        {{ ipInfo.org }}
                    </p>
                </section>

                <hr v-if="lookedUpIp?.row && clientIp" class="my-3 border-border" />

                <!-- Entity section -->
                <section v-if="lookedUpIp?.row">
                    <h4 class="text-base uppercase tracking-wider text-muted-foreground">Entity</h4>
                    <p class="mt-1 text-lg text-[var(--color-accent)]">
                        {{ lookedUpIp.row["Entity Name"] }}
                    </p>
                    <p class="mt-0.5 font-mono text-base text-muted-foreground">
                        {{ lookedUpIp.row["Entity ID"] }}
                    </p>
                </section>

                <!-- Empty state -->
                <p
                    v-if="!clientIp && servers.length === 0 && !lookedUpIp?.row"
                    class="text-lg italic text-muted-foreground"
                >
                    Loading connection info...
                </p>
            </PopoverContent>
        </Popover>

        <!-- Right side: @mbabb -->
        <div class="pointer-events-auto flex items-center gap-3">
            <UserCard />
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
} from "@components/ui/popover";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@components/ui/select";
import UserCard from "./UserCard.vue";
import type { IPInfo, LookedUpIP } from "@src/types/dns";
import type { ManagedServer } from "@src/composables/useServerManager";

withDefaults(
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
    dashboard: [];
}>();
</script>
