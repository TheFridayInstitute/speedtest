/**
 * 2-ring meter: outer + inner, golden-ratio widths.
 */

import type { CanvasColor } from "../core";
import { Canvas } from "../core";
import type { Mesh } from "../shapes";
import { roundedArc, setRoundedArcColor, generateGradient } from "../primitives";
import type { MeterConfig } from "./config";
import { generateColorStops, generateInnerColorStops } from "@utils/utils";

export interface MeterRing {
    mesh: Mesh;
    radius: number;
    lineWidth: number;
    dlColor: CanvasColor;
    ulColor: CanvasColor;
}

export interface RingSet {
    outer: MeterRing;
    inner: MeterRing;
    bgColor: string;
}

export function createRings(cfg: MeterConfig, bgColor: string, canvas: HTMLCanvasElement): RingSet {
    const dlStops = generateColorStops("dl-color");
    const ulStops = generateColorStops("ul-color");

    // Gradient x-coordinates must align with the arc's visual extent in canvas space.
    // The arc is centered at originX, so the gradient spans [originX - span, originX + span].
    const outerSpan = cfg.outerRadius + cfg.outerLineWidth / 2;
    const outerX0 = cfg.originX - outerSpan;
    const outerX1 = cfg.originX + outerSpan;

    const innerSpan = cfg.innerRadius + cfg.innerLineWidth / 2;
    const innerX0 = cfg.originX - innerSpan;
    const innerX1 = cfg.originX + innerSpan;

    return {
        outer: {
            mesh: roundedArc(0, 0, cfg.outerRadius, cfg.startAngle, cfg.endAngle, bgColor, cfg.outerLineWidth),
            radius: cfg.outerRadius, lineWidth: cfg.outerLineWidth,
            dlColor: generateGradient(canvas, dlStops, outerX0, 0, outerX1, 0),
            ulColor: generateGradient(canvas, ulStops, outerX0, 0, outerX1, 0),
        },
        inner: {
            mesh: roundedArc(0, 0, cfg.innerRadius, cfg.startAngle, cfg.endAngle, bgColor, cfg.innerLineWidth),
            radius: cfg.innerRadius, lineWidth: cfg.innerLineWidth,
            dlColor: generateGradient(canvas, dlStops.map(generateInnerColorStops), innerX0, 0, innerX1, 0),
            ulColor: generateGradient(canvas, ulStops.map(generateInnerColorStops), innerX0, 0, innerX1, 0),
        },
        bgColor,
    };
}

export function drawRings(
    canvas: Canvas,
    rings: RingSet,
    stateName: string | undefined,
    t: number,
): void {
    const { outer, inner, bgColor } = rings;

    // Background tracks
    setRoundedArcColor(outer.mesh, bgColor);
    outer.mesh.draw(canvas, 1);
    setRoundedArcColor(inner.mesh, bgColor);
    inner.mesh.draw(canvas, 1);

    if (!stateName || t <= 0) return;

    // Filled arcs
    const outerColor = stateName === "upload" ? outer.ulColor : outer.dlColor;
    const innerColor = stateName === "upload" ? inner.ulColor : inner.dlColor;
    setRoundedArcColor(outer.mesh, outerColor);
    outer.mesh.draw(canvas, t);
    setRoundedArcColor(inner.mesh, innerColor);
    inner.mesh.draw(canvas, t);
}
