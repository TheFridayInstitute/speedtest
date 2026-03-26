/**
 * Canvas primitives — factory functions for composite shapes.
 *
 * These build on the core shapes (Polygon, Arc, Mesh) to create
 * domain-specific visual elements like rounded arcs, rounded rectangles,
 * and segmented progress bars.
 */

import { lerp } from "@mkbabb/keyframes.js";
import type { CanvasColor } from "./core";
import { Arc, Mesh } from "./shapes";

/**
 * Create an arc with rounded end caps.
 *
 * Builds a Mesh of [endCap, arc, startCap] where each cap is a Polygon
 * created from slerp-interpolated points. The returned mesh has a custom
 * draw() method that animates the arc fill based on parameter t ∈ [0, 1].
 *
 * @param originX — center X of the arc
 * @param originY — center Y of the arc
 * @param radius — arc radius
 * @param beginAngle — start angle in radians
 * @param endAngle — end angle in radians
 * @param color — fill/stroke color
 * @param lineWidth — stroke thickness
 */
export function roundedArc(
    originX: number,
    originY: number,
    radius: number,
    beginAngle: number,
    endAngle: number,
    color: CanvasColor,
    lineWidth: number,
): Mesh {
    // Single arc with native round lineCaps — no polygon end caps needed.
    const arc = new Arc(
        originX,
        originY,
        radius,
        beginAngle,
        endAngle,
        color,
        lineWidth,
    );
    arc.lineCap("round");

    const roundedArcMesh = new Mesh(arc);

    /**
     * Custom draw for animated arc fill.
     * t ∈ [0, 1] controls how much of the arc is visible.
     */
    roundedArcMesh.draw = function (ctx, t) {
        const currentEnd = lerp(t, beginAngle, endAngle);
        this.shapes[0]._endAngle = currentEnd;
        this.shapes[0].draw(ctx);
        return this;
    };

    return roundedArcMesh;
}

/**
 * Update the color of all shapes in a rounded arc mesh.
 * Sets fillColor on polygon caps and strokeStyle on the arc.
 */
export function setRoundedArcColor(mesh: Mesh, color: CanvasColor) {
    mesh.map((shape) => {
        if (shape instanceof Arc) {
            shape.color = color;
        }
    });
}

/**
 * Create a canvas linear gradient from an array of color stops.
 *
 * @param canvas — the canvas element (used for dimensions)
 * @param colorStops — array of [position, cssColor] tuples
 * @param x0, y0, x1, y1 — gradient line endpoints (defaults to full width)
 */
export function generateGradient(
    canvas: HTMLCanvasElement,
    colorStops: Array<[number, string]>,
    x0?: number,
    y0?: number,
    x1?: number,
    y1?: number,
): CanvasGradient {
    x0 = x0 ?? 0;
    y0 = y0 ?? 0;
    x1 = x1 ?? canvas.width;
    y1 = y1 ?? 0;

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}

