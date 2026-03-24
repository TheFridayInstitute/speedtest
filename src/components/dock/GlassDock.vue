<script setup lang="ts">
import { computed, onMounted, useTemplateRef } from "vue";
import { useDockState } from "./composables/useDockState";
import { useDockTransition } from "./composables/useDockTransition";

const props = withDefaults(
    defineProps<{
        collapseDelay?: number;
        startCollapsed?: boolean;
        fitContent?: boolean;
        position?: "fixed" | "inline";
        fadeMs?: number;
        alwaysExpanded?: boolean;
    }>(),
    {
        collapseDelay: 2000,
        startCollapsed: true,
        fitContent: false,
        position: "inline",
        fadeMs: 60,
        alwaysExpanded: false,
    },
);

const dockEl = useTemplateRef<HTMLElement>("dockEl");
const alwaysExpanded = computed(() => props.alwaysExpanded);

const {
    expanded,
    isPinned,
    onMouseEnter,
    onMouseLeave,
    onFocusIn,
    onFocusOut,
    onClickCollapsed,
    keepOpen,
    release,
    expand,
    collapse,
} = useDockState({
    collapseDelay: props.collapseDelay,
    rootEl: dockEl,
    alwaysExpanded,
});

const { visualExpanded, isTransitioning, onTransitionEnd } = useDockTransition({
    expanded,
    rootEl: dockEl,
    fadeMs: props.fadeMs,
    alwaysExpanded,
});

onMounted(() => {
    if (props.alwaysExpanded || !props.startCollapsed) {
        expand();
    }
});

defineExpose({ expanded, isPinned, expand, collapse, keepOpen, release });
</script>

<template>
    <div
        ref="dockEl"
        class="glass-dock"
        :class="[
            { expanded: visualExpanded, collapsed: !visualExpanded, pinned: isPinned, 'fit-content': fitContent, 'always-expanded': alwaysExpanded },
            position === 'fixed' ? 'fixed bottom-[var(--dock-pos)] left-1/2 -translate-x-1/2' : 'dock-inline',
        ]"
        @mouseenter="onMouseEnter"
        @mouseleave="onMouseLeave($event)"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
        @transitionend="onTransitionEnd"
    >
        <div class="dock-layers" :class="{ 'dock-transitioning': isTransitioning }">
            <div
                :class="['dock-layer dock-layer--full', { 'layer-active': visualExpanded }]"
                :inert="!expanded || undefined"
            >
                <slot />
            </div>
            <div
                :class="['dock-layer dock-layer--summary', { 'layer-active': !visualExpanded }]"
                :inert="expanded || undefined"
                @click="onClickCollapsed"
            >
                <slot name="collapsed" />
            </div>
        </div>
    </div>
</template>

<style scoped>
.glass-dock {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 0.5rem;
    border-radius: var(--radius-pill);
    background: hsl(var(--card) / 0.92);
    backdrop-filter: var(--glass-blur-light);
    -webkit-backdrop-filter: var(--glass-blur-light);

    @supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
        background: var(--glass-bg);
    }
    border: 1.5px solid hsl(var(--foreground) / 0.25);
    box-shadow:
        0 4px 20px hsl(var(--foreground) / 0.25),
        0 0 0 1px hsl(var(--foreground) / 0.15);
    white-space: nowrap;
    overflow: hidden;
    transition:
        width var(--duration-normal) var(--ease-dock),
        padding var(--duration-normal) var(--ease-dock),
        box-shadow var(--duration-normal) var(--ease-standard),
        transform var(--duration-normal) var(--ease-dock),
        background var(--duration-normal) var(--ease-standard),
        border-color var(--duration-normal) var(--ease-standard);
}

/* ── Collapsed: compact pill ── */
.glass-dock.collapsed {
    cursor: pointer;
    padding: 0.375rem 0.5rem;
    background: var(--glass-bg);
    border-color: hsl(var(--foreground) / 0.3);
    box-shadow:
        0 2px 12px hsl(var(--foreground) / 0.2),
        0 0 0 1px hsl(var(--foreground) / 0.15);
}

.glass-dock.collapsed:hover {
    background: var(--glass-bg);
    border-color: hsl(var(--foreground) / 0.4);
    box-shadow:
        0 4px 20px hsl(var(--foreground) / 0.25),
        0 0 0 1px hsl(var(--foreground) / 0.15);
    transform: scale(1.03);
}

.glass-dock:where(.fixed) {
    z-index: var(--z-dock);
}

.dock-inline {
    margin: 0 auto;
}

/* ── Layer stacking via grid ── */
.dock-layers {
    display: grid;
    transition: opacity 60ms var(--ease-standard);
}

.dock-layers.dock-transitioning {
    opacity: 0;
}

.dock-layer {
    grid-area: 1 / 1;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    height: 2.5rem;
    white-space: nowrap;
}

.dock-layer.layer-active {
    pointer-events: auto;
}

.dock-layer:not(.layer-active) {
    pointer-events: none;
    position: absolute;
    visibility: hidden;
}

.glass-dock.expanded {
    overflow: visible;
}

.glass-dock.always-expanded {
    cursor: default;
    overflow: visible;
}
</style>
