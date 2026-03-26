<template>
    <Card class="absolute right-3 top-3 z-20 w-44 sm:w-56 p-0 overflow-hidden shadow-lg border border-border/60">
        <Collapsible :open="controlsOpen" @update:open="$emit('update:controlsOpen', $event)">
            <div class="flex items-center justify-between p-2 sm:p-3 bg-card/90 backdrop-blur-md">
                <span class="text-xs font-semibold text-foreground">Controls</span>
                <CollapsibleTrigger as-child>
                    <Button variant="ghost" size="icon" class="h-6 w-6">
                        <ChevronDown
                            class="h-3.5 w-3.5 transition-transform"
                            :class="{ 'rotate-180': controlsOpen }"
                        />
                    </Button>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                <div class="space-y-3 px-3 pb-3 bg-card/90 backdrop-blur-md">
                    <!-- Metric selector -->
                    <div>
                        <Label class="mb-1 block text-xs text-muted-foreground">Metric</Label>
                        <div class="grid grid-cols-4 gap-1">
                            <Button
                                v-for="m in metricOptions"
                                :key="m.value"
                                :variant="activeMetric === m.value ? 'default' : 'ghost'"
                                class="h-7 px-1 text-xs"
                                @click="$emit('update:activeMetric', m.value)"
                            >
                                {{ m.label }}
                            </Button>
                        </div>
                    </div>

                    <!-- H3 resolution slider -->
                    <div>
                        <Label class="mb-1 block text-xs text-muted-foreground">
                            H3 Resolution: {{ h3Resolution }}
                        </Label>
                        <input
                            :value="h3Resolution"
                            type="range"
                            :min="4"
                            :max="7"
                            :step="1"
                            class="w-full accent-primary"
                            @input="$emit('update:h3Resolution', Number(($event.target as HTMLInputElement).value))"
                        />
                        <div class="flex justify-between text-[10px] text-muted-foreground">
                            <span>4 (coarse)</span>
                            <span>7 (fine)</span>
                        </div>
                    </div>

                    <!-- Fit to data button -->
                    <Button
                        variant="ghost"
                        class="h-7 w-full text-xs"
                        :disabled="hexDataLength === 0"
                        @click="$emit('fitToData')"
                    >
                        <Maximize2 class="mr-1 h-3 w-3" />
                        Fit to data
                    </Button>
                </div>
            </CollapsibleContent>
        </Collapsible>
    </Card>
</template>

<script setup lang="ts">
import { ChevronDown, Maximize2 } from "lucide-vue-next";
import { Button, Card, Label, Collapsible, CollapsibleTrigger, CollapsibleContent } from "@mkbabb/glass-ui";
import type { DashboardMetric } from "@src/stores/useDashboardFilterStore";

defineProps<{
    activeMetric: DashboardMetric;
    h3Resolution: number;
    controlsOpen: boolean;
    hexDataLength: number;
}>();

defineEmits<{
    "update:activeMetric": [value: DashboardMetric];
    "update:h3Resolution": [value: number];
    "update:controlsOpen": [value: boolean];
    fitToData: [];
}>();

const metricOptions: { value: DashboardMetric; label: string }[] = [
    { value: "download", label: "DL" },
    { value: "upload", label: "UL" },
    { value: "ping", label: "Ping" },
    { value: "jitter", label: "Jit" },
];
</script>
