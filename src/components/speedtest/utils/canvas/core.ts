/**
 * Canvas core — wrapper around the HTML5 Canvas API with transformation support.
 *
 * Provides a Canvas class that tracks a logical origin point, enabling
 * shape drawing relative to a center rather than the top-left corner.
 */

import { rotate, translate, scale, rotateAboutPoint } from "@utils/math";

/** Color type accepted by canvas rendering contexts. */
export type CanvasColor = string | CanvasGradient | CanvasPattern;

/** 2D point as [x, y] tuple. */
export type Point2D = [number, number];

/**
 * Wrapper around an HTMLCanvasElement and its 2D rendering context.
 * Maintains a logical origin point for centered drawing operations.
 */
export class Canvas {
    canvasEl: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    _origin: number[];

    constructor(
        canvasEl: HTMLCanvasElement,
        ctx: CanvasRenderingContext2D,
        origin: number[],
    ) {
        this.canvasEl = canvasEl;
        this.ctx = ctx;
        this._origin = origin;
    }

    /** Apply an arbitrary transform function to the origin. */
    map(func: (origin: number[]) => number[]) {
        this._origin = func(this._origin);
        return this;
    }

    /** Translate the origin by (x, y). */
    translate(x: number, y: number) {
        this._origin = translate(this._origin, x, y);
        return this;
    }

    /** Uniformly scale the origin by factor s. */
    scale(s: number) {
        this._origin = scale(this._origin, s);
        return this;
    }

    /** Rotate the origin by theta (degrees by default, radians if rad=true). */
    rotate(theta: number, rad = false) {
        this._origin = rotate(this._origin, theta, rad);
        return this;
    }

    /** Rotate the origin about an arbitrary point (x, y). */
    rotateAboutPoint(x: number, y: number, theta: number, rad = false) {
        this._origin = rotateAboutPoint(this._origin, x, y, theta, rad);
        return this;
    }

    /** Clear the entire canvas. */
    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    get origin() {
        return this._origin;
    }
    set origin(origin) {
        this._origin = origin;
    }

    get originX() {
        return this._origin[0];
    }
    set originX(originX) {
        this._origin[0] = originX;
    }

    get originY() {
        return this._origin[1];
    }
    set originY(originY) {
        this._origin[1] = originY;
    }

    get width() {
        return this.canvasEl.width;
    }
    set width(width) {
        this.canvasEl.width = width;
    }

    get height() {
        return this.canvasEl.height;
    }
    set height(height) {
        this.canvasEl.height = height;
    }
}
