import { ref, watch, nextTick, onUnmounted, provide, inject } from "vue";
import type { Ref } from "vue";

export interface UseDockStateOptions {
    /** Delay before auto-collapse after mouse leaves (ms) */
    collapseDelay?: number;
    /** Root element ref — used for contains() checks */
    rootEl: Ref<HTMLElement | null>;
    /** Disable collapse behavior and keep the dock expanded. */
    alwaysExpanded?: Ref<boolean> | boolean;
}

export type DockState = "collapsed" | "hover" | "pinned";

export function useDockState(options: UseDockStateOptions) {
    const { collapseDelay = 2500, rootEl, alwaysExpanded = false } = options;

    const getAlwaysExpanded = () =>
        typeof alwaysExpanded === "boolean" ? alwaysExpanded : alwaysExpanded.value;

    const initiallyExpanded = getAlwaysExpanded();
    const state = ref<DockState>(initiallyExpanded ? "pinned" : "collapsed");
    const expanded = ref(initiallyExpanded);
    const isPinned = ref(initiallyExpanded);

    let collapseTimer: ReturnType<typeof setTimeout> | null = null;
    let keepOpenCount = 0;
    let removeClickAway: (() => void) | null = null;

    // Suppress events briefly after mount to avoid phantom triggers
    let ignoreEvents = true;
    setTimeout(() => {
        ignoreEvents = false;
    }, 600);

    function syncDerived() {
        if (getAlwaysExpanded()) {
            state.value = "pinned";
        }
        expanded.value = state.value !== "collapsed";
        isPinned.value = state.value === "pinned";
    }

    function clearTimer() {
        if (collapseTimer) {
            clearTimeout(collapseTimer);
            collapseTimer = null;
        }
    }

    function scheduleCollapse() {
        if (getAlwaysExpanded()) return;
        if (keepOpenCount > 0) return;
        clearTimer();
        collapseTimer = setTimeout(() => {
            state.value = "collapsed";
            syncDerived();
        }, collapseDelay);
    }

    function collapse() {
        if (getAlwaysExpanded()) {
            state.value = "pinned";
            syncDerived();
            return;
        }
        clearTimer();
        state.value = "collapsed";
        syncDerived();
    }

    function expand() {
        if (getAlwaysExpanded()) {
            state.value = "pinned";
            syncDerived();
            return;
        }
        if (ignoreEvents) return;
        clearTimer();
        state.value = "hover";
        syncDerived();
    }

    // --- Mouse handlers ---

    function onMouseEnter() {
        if (getAlwaysExpanded()) return;
        if (ignoreEvents) return;
        clearTimer();
        if (state.value === "collapsed") {
            state.value = "hover";
            syncDerived();
        }
        // If pinned, no-op (stays pinned)
    }

    function onMouseLeave(e?: MouseEvent) {
        if (getAlwaysExpanded()) return;
        if (state.value === "hover") {
            // Something is explicitly holding the dock open (dropdown, edit, etc.)
            if (keepOpenCount > 0) return;
            // Mouse moved to a descendant or teleported child (dropdown, popover)
            if (e) {
                const root = rootEl.value;
                if (
                    root &&
                    e.relatedTarget instanceof Node &&
                    root.contains(e.relatedTarget)
                )
                    return;
                if (isTeleportedTarget(e.relatedTarget)) return;
            }
            scheduleCollapse();
        }
        // If pinned, no-op (stays pinned)
    }

    // --- Focus handlers ---

    function onFocusIn() {
        if (getAlwaysExpanded()) return;
        if (ignoreEvents) return;
        clearTimer();
        if (state.value === "collapsed") {
            state.value = "hover";
            syncDerived();
        }
    }

    function onFocusOut(e: FocusEvent) {
        if (getAlwaysExpanded()) return;
        if (state.value !== "hover") return;
        if (keepOpenCount > 0) return;
        const root = e.currentTarget as HTMLElement;
        if (e.relatedTarget && root.contains(e.relatedTarget as Node)) return;
        // Focus moved to a teleported element (dropdown content, select, popover)
        if (isTeleportedTarget(e.relatedTarget)) return;
        scheduleCollapse();
    }

    // --- Click on collapsed layer → PINNED ---

    function onClickCollapsed() {
        if (getAlwaysExpanded()) {
            state.value = "pinned";
            syncDerived();
            return;
        }
        clearTimer();
        state.value = "pinned";
        syncDerived();
    }

    // --- keepOpen / release (ref-counted child holds) ---

    function keepOpen() {
        keepOpenCount++;
        clearTimer();
    }

    function release() {
        keepOpenCount = Math.max(0, keepOpenCount - 1);
        if (keepOpenCount === 0 && state.value === "hover") {
            scheduleCollapse();
        }
    }

    // Provide for descendant components
    provide("dockKeepOpen", keepOpen);
    provide("dockRelease", release);
    provide("dockExpanded", expanded);

    // --- Click-away listener ---

    function isTeleportedTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) return false;
        // reka-ui teleports dropdown/select/popover content to <body> via Portal.
        // Any of these selectors means the target is logically "inside" the dock.
        return !!(
            target.closest('[data-reka-popper-content-wrapper]') ||
            target.closest('[data-reka-select-content]') ||
            target.closest('[data-reka-dropdown-menu-content]') ||
            target.closest('[data-reka-menu-content]') ||
            target.closest('[role="menu"]') ||
            target.closest('[role="listbox"]') ||
            target.closest('.floating-panel') ||
            target.closest('.dock-popover')
        );
    }

    function onPointerDownOutside(e: PointerEvent) {
        if (getAlwaysExpanded()) return;
        const root = rootEl.value;
        if (!root || root.contains(e.target as Node)) return;
        if (isTeleportedTarget(e.target)) return;

        // Click outside → always collapse, even if keepOpenCount > 0
        // (keepOpenCount prevents timer-based collapse, not explicit dismissal)
        collapse();
    }

    watch(expanded, (isExpanded) => {
        if (isExpanded) {
            // Defer attachment so the opening click doesn't immediately close
            nextTick(() => {
                document.addEventListener(
                    "pointerdown",
                    onPointerDownOutside,
                    true,
                );
                removeClickAway = () => {
                    document.removeEventListener(
                        "pointerdown",
                        onPointerDownOutside,
                        true,
                    );
                    removeClickAway = null;
                };
            });
        } else {
            removeClickAway?.();
        }
    });

    if (typeof alwaysExpanded !== "boolean") {
        watch(alwaysExpanded, (forceOpen) => {
            if (forceOpen) {
                clearTimer();
                state.value = "pinned";
                syncDerived();
                return;
            }
            state.value = "collapsed";
            syncDerived();
        }, { immediate: true });
    } else if (alwaysExpanded) {
        state.value = "pinned";
        syncDerived();
    }

    // Cleanup
    onUnmounted(() => {
        clearTimer();
        removeClickAway?.();
    });

    return {
        state,
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
    };
}
