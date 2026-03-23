<template>
    <Card class="pane-container overflow-scroll">
        <CardContent class="content relative max-h-[70vh] overflow-scroll">
            <div class="bg-background">
                <CardTitle class="font-normal italic">
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
                </CardTitle>

                <h2
                    v-if="hasSpeed"
                    class="bold my-4 text-5xl text-[var(--color-accent)]"
                >
                    {{ getFormattedSpeed(result!.speedtest_dl_speed!) }}
                </h2>

                <h2 v-else class="bold my-4 text-5xl">
                    <LoadingDots />
                </h2>
            </div>

            <hr class="my-6 h-2 rounded-sm bg-foreground" />

            <div v-if="result != null">
                <pre
                    class="mt-4 overflow-auto rounded-md p-4"
                ><code>{{ result }}</code></pre>
            </div>
        </CardContent>
    </Card>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Card, CardContent, CardTitle } from "@components/ui/card";
import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@components/ui/hover-card";
import LoadingDots from "./LoadingDots.vue";
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
