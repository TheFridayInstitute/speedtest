/**
 * useGlass — reusable Vue composable for glass refraction effects.
 * Wraps GlassOverlay for lifecycle management and ref-based API.
 * Does NOT own a render loop — call update() after drawing to the source canvas.
 */

import { watch, onBeforeUnmount, type Ref } from "vue";
import { GlassOverlay } from "@utils/glass/GlassOverlay";
import type { GlassRegion, GlassOptions } from "@utils/glass/types";

export type { GlassRegion, GlassOptions };

export interface UseGlassReturn {
    readonly isSupported: boolean;
    setRegions: (regions: GlassRegion[]) => void;
    update: () => void;
    resize: () => void;
    dispose: () => void;
}

export function useGlass(
    sourceRef: Ref<HTMLCanvasElement | null>,
    overlayRef: Ref<HTMLCanvasElement | null>,
    options?: GlassOptions,
): UseGlassReturn {
    let glass: GlassOverlay | null = null;
    const supported = GlassOverlay.isSupported();

    function init(): void {
        dispose();
        const source = sourceRef.value;
        const overlay = overlayRef.value;
        if (!source || !overlay || !supported) return;
        glass = new GlassOverlay(source, overlay, options);
    }

    function setRegions(regions: GlassRegion[]): void {
        glass?.setRegions(regions);
    }

    function update(): void {
        glass?.render();
    }

    function resize(): void {
        glass?.resize();
    }

    function dispose(): void {
        glass?.dispose();
        glass = null;
    }

    watch([sourceRef, overlayRef], () => init());
    onBeforeUnmount(() => dispose());

    return { isSupported: supported, setRegions, update, resize, dispose };
}
