<template>
    <ScrollPane>
        <ScrollPaneHeader>
            <HoverCard>
                <HoverCardTrigger>
                    <a
                        class="cursor-pointer hover:underline"
                        :href="pcapUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ clientUID }}
                    </a>
                </HoverCardTrigger>
                <HoverCardContent>
                    <div class="p-4">
                        <p>Click to view the raw DNS</p>
                    </div>
                </HoverCardContent>
            </HoverCard>
        </ScrollPaneHeader>

        <div class="px-4 sm:px-6 pb-4 pt-2">
            <h2
                v-if="hasSpeed"
                class="bold my-4 text-5xl text-th-accent"
            >
                {{ getFormattedSpeed(result!.speedtest_dl_speed!) }}
            </h2>

            <h2 v-else class="bold my-4 text-5xl">
                <LoadingDots />
            </h2>

            <Separator class="my-6" />

            <div v-if="result != null">
                <pre
                    class="glass mt-4 overflow-auto rounded-md p-4"
                ><code>{{ result }}</code></pre>
            </div>
        </div>
    </ScrollPane>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { ScrollPane, ScrollPaneHeader } from "@mkbabb/glass-ui";
import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@mkbabb/glass-ui";
import { Separator } from "@mkbabb/glass-ui";
import LoadingDots from "@src/components/LoadingDots.vue";
import type { DNSSpeedtestResultData } from "@src/types/server";

const props = defineProps<{
    result: DNSSpeedtestResultData | undefined;
    clientUID: string;
    getFormattedSpeed: (speed: number) => string;
}>();

const pcapUrl = computed(() => {
    return `https://ip.friday.institute/dns-results/pcap/uid/${props.clientUID}`;
});

const hasSpeed = computed(() => {
    return (
        props.result?.speedtest_dl_speed != null &&
        Number.isFinite(props.result.speedtest_dl_speed)
    );
});
</script>
