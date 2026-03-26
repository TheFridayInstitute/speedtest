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
    Check,
} from "lucide-vue-next";
import GlassDock from "./GlassDock.vue";
import type { SpeedtestStatus } from "@src/types/speedtest";

export type AppView = "speedtest" | "survey" | "dashboard" | "thankyou";

export interface SurveyDockState {
    isFirstStep: boolean;
    isLastStep: boolean;
    editingFromReview: boolean;
}

const props = defineProps<{
    currentView: AppView;
    speedtestStatus: SpeedtestStatus;
    canGoBack: boolean;
    surveyState?: SurveyDockState;
}>();

const isRunning = computed(() => props.speedtestStatus.isRunning);
const testCompleted = computed(() => props.speedtestStatus.isCompleted);

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

const isSpeedtestView = computed(() => props.currentView === "speedtest");
const isSurvey = computed(() => props.currentView === "survey" && !!props.surveyState);
const isSurveyView = computed(() => props.currentView === "survey");

// ── Survey primary button ──────────────────────────────────────────────

const surveyLabel = computed(() => {
    if (isSurvey.value) {
        const s = props.surveyState!;
        if (s.editingFromReview) return "Done";
        return s.isLastStep ? "Submit" : "Next";
    }
    if (isSurveyView.value) return "Next";
    return null;
});

const surveyIcon = computed(() => {
    if (isSurvey.value) {
        const s = props.surveyState!;
        if (s.isLastStep || s.editingFromReview) return Check;
    }
    return ArrowRight;
});
</script>

<template>
    <div
        class="fixed bottom-[var(--dock-inset,1rem)] inset-x-0 z-40 flex items-center justify-center pointer-events-none"
    >
        <div class="pointer-events-auto">
            <GlassDock ref="dockRef" :collapse-delay="3000" :start-collapsed="false" position="inline" :always-expanded="true">
                <!-- Back button (always) -->
                <button
                    class="dock-icon-btn"
                    title="Back"
                    :disabled="!canGoBack"
                    @click="emit('back')"
                >
                    <ArrowLeft class="w-5 h-5" />
                </button>

                <div class="dock-separator" />

                <!-- ═══ SPEEDTEST VIEW ═══ -->
                <template v-if="isSpeedtestView">
                    <!-- Stop (only while running) -->
                    <button
                        v-if="isRunning"
                        class="dock-icon-btn"
                        title="Stop"
                        @click="emit('stop')"
                    >
                        <Square class="w-4 h-4" />
                    </button>

                    <!-- Retake (only when completed, not running) -->
                    <button
                        v-if="testCompleted && !isRunning"
                        class="dock-icon-btn"
                        title="Retake"
                        @click="emit('retake')"
                    >
                        <RotateCcw class="w-4 h-4" />
                    </button>

                    <!-- Start (only when idle) -->
                    <button
                        v-if="!isRunning && !testCompleted"
                        class="dock-icon-btn flex items-center gap-1.5 !w-auto px-3"
                        title="Start"
                        :style="{ background: 'var(--th-accent-opaque)', color: 'white' }"
                        @click="emit('start')"
                    >
                        <Play class="w-4 h-4" />
                        <span class="text-lg font-medium">Start</span>
                    </button>

                    <!-- Next → (always visible on speedtest view, goes to survey) -->
                    <button
                        v-if="isRunning || testCompleted"
                        class="dock-icon-btn flex items-center gap-1.5 !w-auto px-3"
                        title="Next"
                        :style="{ background: 'var(--th-accent-opaque)', color: 'white' }"
                        @click="emit('next')"
                    >
                        <ArrowRight class="w-4 h-4" />
                        <span class="text-lg font-medium">Next</span>
                    </button>
                </template>

                <!-- ═══ SURVEY VIEW ═══ -->
                <template v-else-if="isSurveyView">
                    <button
                        class="dock-icon-btn flex items-center gap-1.5 !w-auto px-3"
                        title="Next"
                        :style="{ background: 'var(--th-accent-opaque)', color: 'white' }"
                        @click="emit('forward')"
                    >
                        <component :is="surveyIcon" class="w-4 h-4" />
                        <span class="text-lg font-medium">{{ surveyLabel }}</span>
                    </button>
                </template>

                <!-- ═══ THANKYOU / OTHER ═══ -->
                <template v-else-if="currentView === 'thankyou'">
                    <button
                        class="dock-icon-btn flex items-center gap-1.5 !w-auto px-3"
                        @click="emit('forward')"
                    >
                        <ArrowRight class="w-4 h-4" />
                        <span class="text-lg font-medium">New Test</span>
                    </button>
                </template>

                <div class="dock-separator" />

                <!-- Dashboard (always) -->
                <button class="dock-icon-btn" title="Dashboard" @click="emit('dashboard')">
                    <LayoutDashboard class="w-5 h-5" />
                </button>

                <template #collapsed>
                    <component
                        v-if="isRunning && speedtestStatus.currentPhase && phaseIconMap[speedtestStatus.currentPhase]"
                        :is="phaseIconMap[speedtestStatus.currentPhase]"
                        class="w-5 h-5 shrink-0"
                        :class="{ 'animate-spin': speedtestStatus.currentPhase === 'started' }"
                        :style="{ color: 'var(--th-accent-opaque)' }"
                    />
                    <Play v-else class="w-5 h-5 shrink-0" />
                    <span class="text-lg font-medium whitespace-nowrap">
                        {{ testCompleted ? 'Complete' : 'Speedtest' }}
                    </span>
                </template>
            </GlassDock>
        </div>
    </div>
</template>

