/**
 * Canvas primitives — factory functions for composite shapes.
 *
 * These build on the core shapes (Polygon, Arc, Mesh) to create
 * domain-specific visual elements like rounded arcs, rounded rectangles,
 * and segmented progress bars.
 */

import { slerpPoints, lerp } from "@utils/math";
import type { CanvasColor } from "./core";
import { Polygon, Arc, Rectangle, Mesh } from "./shapes";

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
 * Create a rectangle with rounded (slerped) end caps.
 *
 * Returns a Mesh of [leftCap, bar, rightCap] with a custom draw()
 * method that animates the bar width based on parameter t ∈ [0, 1].
 *
 * @param leftX — left edge X
 * @param leftY — top edge Y
 * @param width — total bar width
 * @param height — bar height
 * @param fillColor — fill color
 */
export function roundedRectangle(
    leftX: number,
    leftY: number,
    width: number,
    height: number,
    fillColor: CanvasColor,
): Mesh {
    const slump = -0.3;
    const r = Math.abs((leftY - height) / 2);

    const leftSide = [
        [leftX, leftY],
        [leftX, leftY - height],
    ];
    const rightSide = [
        [leftX + width, leftY],
        [leftX + width, leftY - height],
    ];

    width -= 2 * r;

    const slerpsLeft = slerpPoints(leftSide[0], leftSide[1], 1);
    const slerpsRight = slerpPoints(rightSide[1], rightSide[0], -1);

    const startCap = new Polygon(slerpsLeft, null, null, fillColor);
    const bar = new Rectangle(leftX, leftY, width, height, fillColor);
    const endCap = new Polygon(slerpsRight, null, null, fillColor);

    const shiftX = -width / 2;
    const shiftY = height / 2;

    startCap.translate(shiftX - slump, shiftY);
    endCap.translate(shiftX - 2 * r, shiftY);
    bar.translate(shiftX, -shiftY);

    const roundedBarMesh = new Mesh(startCap, bar, endCap);
    const [cX, cY] = bar.centroid;

    /**
     * Custom draw for animated bar fill.
     * t ∈ [0, 1] controls the visible width of the bar.
     */
    roundedBarMesh.draw = function (ctx, t) {
        const w = t * width;

        const [tcX, tcY] = bar.centroid;
        const sX = tcX - cX - bar.width / 2;
        const sY = tcY - cY - bar.height / 2;

        bar.translate(-sX, -sY);
        bar.width = w;
        bar.translate(sX, sY);

        t = -(1 - t) * width + slump;

        endCap.translate(t, 0);
        for (const shape of this.shapes) {
            shape.draw(ctx);
        }
        endCap.translate(-t, 0);
        return this;
    };

    return roundedBarMesh;
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

/**
 * Create a segmented progress bar from an array of colors.
 *
 * Each segment is a roundedRectangle. The returned mesh has a custom
 * draw() that fills segments sequentially based on t ∈ [0, 1].
 *
 * @param leftX — left edge X
 * @param leftY — top edge Y
 * @param width — total bar width
 * @param height — bar height
 * @param colors — array of CSS color strings, one per segment
 */
export function progressBarIntervals(
    leftX: number,
    leftY: number,
    width: number,
    height: number,
    colors: string[],
): Mesh {
    const shapes: Mesh[] = [];
    let step = 0;
    const w = width / colors.length - height / colors.length;

    for (const color of colors) {
        const tw = w + height;
        const rRect = roundedRectangle(leftX, leftY, tw, height, color);
        rRect.translate(-width / 2 + tw / 2 + step, 0);
        shapes.push(rRect);
        step += w;
    }

    const intervalMesh = new Mesh(...shapes);

    /**
     * Custom draw that fills segments sequentially.
     * t ∈ [0, 1] controls total fill progress across all segments.
     */
    intervalMesh.draw = function (ctx, t) {
        const n = this.shapes.length;
        const step = 1 / n;
        let s = t;

        for (const shape of this.shapes) {
            if (s > 0) {
                const v = s - step > 0 ? 1 : s / step;
                shape.draw(ctx, v);
                s -= step;
            } else {
                break;
            }
        }
        return this;
    };

    return intervalMesh;
}
