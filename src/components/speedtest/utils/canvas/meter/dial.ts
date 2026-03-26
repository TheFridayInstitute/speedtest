/**
 * Meter dial (needle) and center dot.
 *
 * The dial is a rounded line from the canvas origin outward at a given
 * angle. The dot is a filled circle at the center.
 */

import type { CanvasColor } from "../core";
import { Canvas } from "../core";
import { Arc } from "../shapes";
import type { MeterConfig } from "./config";

export interface DialState {
    color: CanvasColor;
    length: number;
    width: number;
    dotRadius: number;
    dotMesh: Arc;
}

/**
 * Create the dial state including the center dot mesh.
 */
export function createDial(config: MeterConfig, dialColor: string): DialState {
    const dotMesh = new Arc(
        0,
        0,
        config.dotRadius,
        0,
        Math.PI * 2,
        dialColor,
        1,
    );
    dotMesh.fillColor = dialColor;

    return {
        color: dialColor,
        length: config.dialLength,
        width: config.dialWidth,
        dotRadius: config.dotRadius,
        dotMesh,
    };
}

/**
 * Draw the center dot and dial line at the given angle.
 *
 * @param canvas - Canvas wrapper (provides origin + context)
 * @param dial   - Dial configuration and mesh
 * @param theta  - Current angle in radians
 */
export function drawDial(canvas: Canvas, dial: DialState, theta: number): void {
    const ctx = canvas.ctx;
    const ox = canvas.originX;
    const oy = canvas.originY;

    // Draw the center dot
    dial.dotMesh.draw(canvas);

    // Draw the dial line
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = dial.color as string;
    ctx.lineWidth = dial.width;
    ctx.lineCap = "round";
    ctx.moveTo(ox, oy);
    ctx.lineTo(
        ox + Math.cos(theta) * dial.length,
        oy + Math.sin(theta) * dial.length,
    );
    ctx.stroke();
    ctx.restore();
}
