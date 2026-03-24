<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import {
    ArrowLeft,
    ArrowRight,
    Play,
    Square,
    LayoutDashboard,
    RotateCcw,
    Download,
    Upload,
    Activity,
    Loader,
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

/** Map speedtest phase names to lucide icons. */
const phaseIconMap: Record<string, any> = {
    download: Download,
    upload: Upload,
    ping: Activity,
    started: Loader,
};

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

/** Color for the phase icon — accent pink during active phases. */
const phaseColor = computed(() => {
    if (!props.isRunning) return undefined;
    if (props.currentPhase === 'started') return undefined; // neutral while initializing
    return 'var(--color-accent-opaque)';
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
                    <!-- Phase icon when running -->
                    <component
                        v-if="isRunning && currentPhase && phaseIconMap[currentPhase]"
                        :is="phaseIconMap[currentPhase]"
                        class="w-4 h-4"
                        :class="{ 'animate-spin': currentPhase === 'started' }"
                    />
                    <component
                        v-else
                        :is="primaryIcon"
                        class="w-4 h-4"
                    />
                    <span v-if="!isRunning" class="text-lg font-medium">{{ primaryLabel }}</span>
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
                    <!-- Phase icon when running -->
                    <component
                        v-if="isRunning && currentPhase && phaseIconMap[currentPhase]"
                        :is="phaseIconMap[currentPhase]"
                        class="w-5 h-5 shrink-0"
                        :class="{ 'animate-spin': currentPhase === 'started' }"
                        :style="phaseColor ? { color: phaseColor } : {}"
                    />
                    <component
                        v-else
                        :is="primaryIcon"
                        class="w-5 h-5 shrink-0"
                        :style="testCompleted ? { color: 'var(--color-accent-opaque)' } : {}"
                    />
                    <span
                        v-if="!isRunning"
                        class="text-lg font-medium whitespace-nowrap"
                        :style="testCompleted ? { color: 'var(--color-accent-opaque)' } : {}"
                    >
                        {{ testCompleted ? 'Complete' : 'Speedtest' }}
                    </span>
                </template>
            </GlassDock>
        </div>
    </div>
</template>
