/**
 * Meter progress bar — native ctx.roundRect, no polygon seams.
 */

import type { CanvasColor } from "../core";
import { Canvas } from "../core";
import type { MeterConfig } from "./config";

export interface ProgressBarState {
    x: number;
    y: number;
    width: number;
    height: number;
    cornerRadius: number;
    fillColor: CanvasColor;
    bgColor: CanvasColor;
}

export function createProgressBar(
    config: MeterConfig,
    fillColor: string,
    bgColor: string,
): ProgressBarState {
    const { barWidth, barHeight, barY } = config;
    const cornerRadius = barHeight / 2;

    return {
        x: -barWidth / 2,
        y: barY - barHeight,
        width: barWidth,
        height: barHeight,
        cornerRadius,
        fillColor,
        bgColor,
    };
}

export function drawProgressBar(canvas: Canvas, bar: ProgressBarState, t: number): void {
    const ctx = canvas.ctx;
    const ox = canvas.originX;
    const oy = canvas.originY;

    const rx = ox + bar.x;
    const ry = oy + bar.y;
    const { width, height, cornerRadius } = bar;

    // Background track (full rounded rect)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(rx, ry, width, height, cornerRadius);
    ctx.fillStyle = bar.bgColor as string;
    ctx.fill();
    ctx.restore();

    // Animated fill (also a rounded rect — leading edge is rounded)
    if (t > 0) {
        const fillWidth = Math.max(height, width * t); // min width = height (ensures round caps)
        ctx.save();
        ctx.beginPath();
        // Clip to the background shape so fill can't overflow
        ctx.roundRect(rx, ry, width, height, cornerRadius);
        ctx.clip();
        // Draw the fill as its own rounded rect
        ctx.beginPath();
        ctx.roundRect(rx, ry, fillWidth, height, cornerRadius);
        ctx.fillStyle = bar.fillColor as string;
        ctx.fill();
        ctx.restore();
    }
}
