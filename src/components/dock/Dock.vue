<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import {
    ArrowLeft,
    ArrowRight,
    Play,
    Square,
    LayoutDashboard,
    RotateCcw,
} from "lucide-vue-next";
import GlassDock from "./GlassDock.vue";

export type AppView = "speedtest" | "survey" | "dashboard" | "thankyou";

const props = defineProps<{
    currentView: AppView;
    isRunning: boolean;
    testCompleted: boolean;
    canGoBack: boolean;
    currentPhase?: string;
}>();

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const emit = defineEmits<{
    start: [];
    stop: [];
    next: [];
    retake: [];
    back: [];
    forward: [];
    dashboard: [];
}>();

const dockRef = useTemplateRef<InstanceType<typeof GlassDock>>("dockRef");

const primaryLabel = computed(() => {
    if (props.currentView === "survey") return null; // survey has its own buttons
    if (props.currentView === "dashboard") return null;
    if (props.currentView === "thankyou") return null;
    if (props.isRunning) return "Stop";
    if (props.testCompleted) return "Next";
    return "Start";
});

const primaryIcon = computed(() => {
    if (props.isRunning) return Square;
    if (props.testCompleted) return ArrowRight;
    return Play;
});

const primaryButtonStyle = computed(() => {
    if (props.isRunning) {
        return {
            background: 'hsl(var(--destructive))',
            color: 'hsl(var(--destructive-foreground))',
        };
    }
    // Start or Next — accent pink
    return {
        background: 'var(--color-accent-opaque)',
        color: 'white',
    };
});

const showRetake = computed(
    () => props.testCompleted && !props.isRunning && props.currentView === "speedtest",
);

function onPrimary() {
    if (props.isRunning) emit("stop");
    else if (props.testCompleted) emit("next");
    else emit("start");
}
</script>

<template>
    <div
        class="fixed bottom-[var(--dock-inset,1rem)] inset-x-0 z-40 flex items-center justify-center pointer-events-none"
    >
        <div class="pointer-events-auto">
            <GlassDock ref="dockRef" :collapse-delay="3000" :start-collapsed="false" position="inline">
                <!-- Back button -->
                <button
                    class="dock-icon-btn"
                    title="Back"
                    :disabled="!canGoBack"
                    @click="emit('back')"
                >
                    <ArrowLeft class="w-5 h-5" />
                </button>

                <div v-if="primaryLabel || showRetake" class="dock-separator" />

                <!-- Primary action (Start / Stop / Next) -->
                <button
                    v-if="primaryLabel"
                    class="dock-icon-btn flex items-center gap-1.5 !w-auto px-3"
                    :title="primaryLabel"
                    :style="primaryButtonStyle"
                    @click="onPrimary"
                >
                    <component
                        :is="primaryIcon"
                        class="w-4 h-4"
                    />
                    <span class="text-lg font-medium">{{ primaryLabel }}</span>
                </button>

                <!-- Retake (only when completed) -->
                <button
                    v-if="showRetake"
                    class="dock-icon-btn flex items-center gap-1.5 !w-auto px-2"
                    title="Retake"
                    @click="emit('retake')"
                >
                    <RotateCcw class="w-4 h-4" />
                    <span class="text-base">Retake</span>
                </button>

                <div v-if="primaryLabel || showRetake" class="dock-separator" />

                <!-- Forward -->
                <button
                    class="dock-icon-btn"
                    title="Next view"
                    @click="emit('forward')"
                >
                    <ArrowRight class="w-5 h-5" />
                </button>

                <div class="dock-separator" />

                <!-- Dashboard -->
                <button class="dock-icon-btn" title="Dashboard" @click="emit('dashboard')">
                    <LayoutDashboard class="w-5 h-5" />
                </button>

                <template #collapsed>
                    <component
                        :is="primaryIcon"
                        class="w-5 h-5 shrink-0"
                        :class="isRunning ? 'text-destructive' : ''"
                    />
                    <span
                        class="text-lg font-medium whitespace-nowrap"
                        :style="testCompleted && !isRunning ? { color: 'var(--color-accent-opaque)' } : {}"
                    >
                        {{ isRunning ? (currentPhase ? capitalize(currentPhase) + '...' : 'Testing...') : testCompleted ? 'Complete' : 'Speedtest' }}
                    </span>
                </template>
            </GlassDock>
        </div>
    </div>
</template>
