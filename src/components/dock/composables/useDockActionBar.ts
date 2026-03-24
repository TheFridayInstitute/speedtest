/**
 * Generic dock action bar system.
 *
 * Any view can provide a DockActionBar — a list of actions with icons,
 * titles, and callbacks. The TopDock renders them as dock-icon-btn buttons.
 *
 * The ColorPicker's ActionBarContext is a specific, richer implementation
 * that also supports input mode cycling. The generic system handles
 * simpler views (Generate, Gradient, Mix).
 */

import type { Component, InjectionKey, Ref } from "vue";

export interface DockAction {
    key: string;
    icon: Component;
    title: string;
    description: string;
    rotateOnClick?: boolean;
    iconClass?: string;
    disabled?: boolean;
    handler: () => void;
}

export interface DockActionBar {
    /** The label shown next to the Tools toggle button */
    label: string;
    /** Icon for the Tools toggle */
    icon: Component;
    /** Accent color for the action bar */
    accentColor?: string;
    /** The actions to display in the dock */
    actions: Ref<DockAction[]>;
    /**
     * If present, the dock will use the ColorPicker's ActionBarLayer
     * instead of the generic action bar. This keeps backward compat.
     */
    colorPickerContext?: any;
}

export const DOCK_ACTION_BAR_KEY: InjectionKey<Ref<DockActionBar | null>> =
    Symbol("dockActionBar");
