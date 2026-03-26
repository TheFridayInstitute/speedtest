/**
 * Canvas shapes — drawable geometric primitives.
 *
 * Shape is the abstract base class; Polygon, Arc, Rectangle, and Mesh
 * extend it with specific draw() implementations. All shapes support
 * in-place affine transforms (translate, scale, rotate).
 */

import { rotate, translate, scale, rotateAboutPoint } from "../math";
import { Canvas, type CanvasColor } from "./core";

/**
 * Abstract base class for all drawable shapes.
 * Stores an array of control points and rendering properties.
 */
export class Shape {
    _points: number[][];
    _color: CanvasColor;
    _lineWidth: number;
    _fillColor: CanvasColor;
    _shadowColor: string;
    _shadowBlur: number;

    constructor(
        points: number[][],
        color: CanvasColor,
        lineWidth: number,
        fillColor?: CanvasColor,
        shadowColor?: string,
        shadowBlur?: number,
    ) {
        this._points = points;
        this._color = color == undefined ? "black" : color;
        this._lineWidth = lineWidth == undefined ? 1 : lineWidth;
        this._fillColor = fillColor;
        this._shadowColor = shadowColor;
        this._shadowBlur = shadowBlur;
    }

    /** Apply a function to each point in-place. */
    map(func: (point: number[], index: number) => void) {
        this._points.map((xy, index) => func(xy, index));
        return this;
    }

    /** Translate all points by (x, y). */
    translate(x: number, y: number) {
        this._points.map((xy) => translate(xy, x, y));
        return this;
    }

    /** Uniformly scale all points by factor s. */
    scale(s: number) {
        this._points.map((xy) => scale(xy, s));
        return this;
    }

    /** Rotate all points by theta (degrees by default, radians if rad=true). */
    rotate(theta: number, rad = false) {
        this._points.map((xy) => rotate(xy, theta, rad));
        return this;
    }

    /** Rotate all points about an arbitrary center (x, y). */
    rotateAboutPoint(x: number, y: number, theta: number, rad = false) {
        this._points.map((xy) => {
            rotateAboutPoint(xy, x, y, theta, rad);
        });
        return this;
    }

    get points() {
        return this._points;
    }
    set points(points) {
        this._points = points;
    }

    /** Compute the geometric centroid of all points. */
    get centroid(): [number, number] {
        let cX = 0;
        let cY = 0;
        for (const [x, y] of this._points) {
            cX += x;
            cY += y;
        }
        cX /= this._points.length;
        cY /= this._points.length;
        return [cX, cY];
    }

    get color() {
        return this._color;
    }
    set color(color) {
        this._color = color;
    }

    get lineWidth() {
        return this._lineWidth;
    }
    set lineWidth(lineWidth) {
        this._lineWidth = lineWidth;
    }

    get fillColor() {
        return this._fillColor;
    }
    set fillColor(fillColor) {
        this._fillColor = fillColor;
    }

    get shadowColor() {
        return this._shadowColor;
    }
    set shadowColor(shadowColor) {
        this._shadowColor = shadowColor;
    }

    get shadowBlur() {
        return this._shadowBlur;
    }
    set shadowBlur(shadowBlur) {
        this._shadowBlur = shadowBlur;
    }
}

/**
 * A closed polygon drawn from an ordered list of vertices.
 * Renders as a filled shape if fillColor is set, otherwise stroked.
 */
export class Polygon extends Shape {
    constructor(
        points: number[][],
        color: CanvasColor,
        lineWidth: number,
        fillColor: CanvasColor,
    ) {
        super(points, color, lineWidth, fillColor);
    }

    /**
     * Draw the polygon onto a canvas context.
     * If ctx is a Canvas wrapper, draws relative to its origin.
     */
    draw(ctx: CanvasRenderingContext2D | Canvas, t?: number) {
        let originX = 0;
        let originY = 0;

        if (ctx instanceof Canvas) {
            const canvas = ctx;
            ctx = canvas.ctx;
            originX = canvas.originX;
            originY = canvas.originY;
        }

        ctx.beginPath();
        ctx.strokeStyle = this._color;
        ctx.lineWidth = this._lineWidth;

        if (this._fillColor) {
            ctx.fillStyle = this._fillColor;
        }
        ctx.shadowColor = this._shadowColor || "black";
        ctx.shadowBlur = this._shadowBlur || 0;

        for (const [x, y] of this._points) {
            ctx.lineTo(x + originX, originY + y);
        }

        if (this._fillColor) {
            ctx.fill();
        } else {
            ctx.stroke();
        }

        return this;
    }
}

/**
 * A circular arc segment defined by center, radius, and angle range.
 * Can be filled or stroked depending on fillColor.
 */
export class Arc extends Shape {
    _radius: number;
    _beginAngle: number;
    _endAngle: number;
    _lineCap: CanvasLineCap = "butt";

    constructor(
        originX: number,
        originY: number,
        radius: number,
        beginAngle: number,
        endAngle: number,
        color: CanvasColor,
        lineWidth: number,
    ) {
        super([[originX, originY]], color, lineWidth);
        this._radius = radius;
        this._beginAngle = beginAngle;
        this._endAngle = endAngle;
    }

    lineCap(cap: CanvasLineCap): this {
        this._lineCap = cap;
        return this;
    }

    /**
     * Draw the arc onto a canvas context.
     * If ctx is a Canvas wrapper, draws relative to its origin.
     */
    draw(ctx: CanvasRenderingContext2D | Canvas, t?: number) {
        let originX = 0;
        let originY = 0;

        if (ctx instanceof Canvas) {
            const canvas = ctx;
            ctx = canvas.ctx;
            originX = canvas.originX;
            originY = canvas.originY;
        }

        ctx.beginPath();
        ctx.strokeStyle = this._color;
        ctx.lineWidth = this._lineWidth;
        ctx.lineCap = this._lineCap ?? "butt";

        if (this._fillColor) {
            ctx.fillStyle = this._fillColor;
        }
        ctx.shadowColor = this._shadowColor || "black";
        ctx.shadowBlur = this._shadowBlur || 0;

        ctx.arc(
            this.points[0][0] + originX,
            this.points[0][1] + originY,
            this._radius,
            this._beginAngle,
            this._endAngle,
        );

        if (this._fillColor) {
            ctx.fill();
        } else {
            ctx.stroke();
        }

        return this;
    }

    get radius() {
        return this._radius;
    }
    set radius(radius) {
        this._radius = radius;
    }

    get beginAngle() {
        return this._beginAngle;
    }
    set beginAngle(beginAngle) {
        this._beginAngle = beginAngle;
    }

    get endAngle() {
        return this._endAngle;
    }
    set endAngle(endAngle) {
        this._endAngle = endAngle;
    }
}

/**
 * An axis-aligned rectangle defined by corner position and dimensions.
 * Extends Polygon with width/height accessors.
 */
export class Rectangle extends Polygon {
    _width: number;
    _height: number;
    leftX: number;
    leftY: number;

    constructor(
        leftX: number,
        leftY: number,
        width: number,
        height: number,
        fillColor: CanvasColor,
    ) {
        const points = [
            [leftX, leftY],
            [leftX + width, leftY],
            [leftX + width, leftY + height],
            [leftX, leftY + height],
        ];
        super(points, undefined, undefined, fillColor);
        this._width = width;
        this._height = height;
        this.leftX = leftX;
        this.leftY = leftY;
    }

    get height() {
        return this._height;
    }
    set height(height) {
        this._points[2][1] = height;
        this._points[3][1] = height;
        this._height = height;
    }

    get width() {
        return this._width;
    }
    set width(width) {
        this._points[1][0] = width;
        this._points[2][0] = width;
        this._width = width;
    }
}

/**
 * A composite container that groups multiple shapes together.
 * Group transforms propagate to all contained shapes.
 * Custom draw() methods can be assigned for specialized rendering
 * (e.g., rounded arcs with animated end caps).
 */
export class Mesh {
    shapes: (Polygon | Arc | Mesh)[];

    constructor(...shapes: (Mesh | Polygon | Arc)[]) {
        this.shapes = shapes;
    }

    /** Add a shape to this mesh. */
    add(shape: Polygon | Arc | Mesh) {
        this.shapes.push(shape);
        return this;
    }

    /**
     * Draw all contained shapes in order.
     * @param t — normalized progress [0, 1] passed to each shape's draw().
     */
    draw(ctx: CanvasRenderingContext2D | Canvas, t: number) {
        for (const shape of this.shapes) {
            shape.draw(ctx, t);
        }
        return this;
    }

    /** Iterate over all shapes with a callback. */
    map(func: (shape: Polygon | Arc | Mesh, index: number) => void) {
        let i = 0;
        for (const shape of this.shapes) {
            func(shape, i++);
        }
        return this;
    }

    /** Translate all shapes by (x, y). */
    translate(x: number, y: number) {
        for (const shape of this.shapes) {
            shape.translate(x, y);
        }
        return this;
    }

    /** Uniformly scale all shapes by factor s. */
    scale(s: number) {
        for (const shape of this.shapes) {
            shape.scale(s);
        }
        return this;
    }

    /** Rotate all shapes by theta. */
    rotate(theta: number, rad = false) {
        for (const shape of this.shapes) {
            shape.rotate(theta, rad);
        }
        return this;
    }

    /** Rotate all shapes about an arbitrary center (x, y). */
    rotateAboutPoint(x: number, y: number, theta: number, rad = false) {
        for (const shape of this.shapes) {
            shape.rotateAboutPoint(x, y, theta, rad);
        }
        return this;
    }
}
