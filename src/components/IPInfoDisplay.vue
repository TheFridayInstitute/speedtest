<template>
    <div class="z-10 flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 self-start px-4 py-2">
        <div
            class="text-3xl text-[var(--color-accent)]"
            v-if="lookedUpIp?.row"
        >
            {{ lookedUpIp.row["Entity Name"] }},
            <span class="italic">{{ lookedUpIp.row["Entity ID"] }}</span>
        </div>

        <div class="text-lg">
            <span class="font-mono">{{ clientIp }}</span>
            <template v-if="ipInfo?.org">
                &mdash; <span class="italic">{{ ipInfo.org }}</span>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { IPInfo, LookedUpIP } from "@src/types/dns";

defineProps<{
    clientIp: string;
    ipInfo: IPInfo | null;
    lookedUpIp: LookedUpIP | null;
}>();
</script>
