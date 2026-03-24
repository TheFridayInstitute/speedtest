<template>
    <div class="server-selector flex flex-col gap-2">
        <div
            v-for="server in servers"
            :key="server.id"
            class="glass flex cursor-pointer items-center justify-between rounded-lg p-3 transition-all hover:opacity-80"
            :class="{ 'ring-2 ring-[var(--color-accent)]': server.id === activeServerId }"
            @click="emit('select', server.id)"
        >
            <div class="flex items-center gap-2">
                <div
                    class="h-2 w-2 rounded-full"
                    :class="
                        server.id === activeServerId
                            ? 'bg-[var(--color-accent)]'
                            : 'bg-muted-foreground/40'
                    "
                ></div>
                <span class="font-mono text-lg">{{ server.config.name }}</span>
                <span
                    class="text-base text-muted-foreground"
                    v-if="server.type === 'dns'"
                >(DNS)</span>
                <span
                    class="text-base text-muted-foreground"
                    v-else
                >(Traditional)</span>
            </div>

            <button
                v-if="servers.length > 1"
                class="text-muted-foreground hover:text-destructive"
                title="Remove server"
                @click.stop="emit('remove', server.id)"
            >
                &times;
            </button>
        </div>

        <p
            v-if="servers.length === 0"
            class="text-lg italic text-muted-foreground"
        >
            No servers configured.
        </p>
    </div>
</template>

<script setup lang="ts">
import type { ManagedServer } from "@src/composables/useServerManager";

defineProps<{
    servers: ManagedServer[];
    activeServerId: string | null;
}>();

const emit = defineEmits<{
    select: [id: string];
    remove: [id: string];
}>();
</script>
