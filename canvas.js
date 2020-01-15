import { Color } from "./colors.js";

export function translate(xy, tX, tY) {
    xy[0] += tX;
    xy[1] += tY;
    return xy;
}

export function scale(xy, s) {
    xy[0] *= s;
    xy[1] *= s;
    return xy;
}

export function rotate(xy, theta, rad = false) {
    if (!rad) {
        theta *= Math.PI / 180;
    }
    let x = xy[0];
    let y = xy[1];
    xy[0] = x * Math.cos(theta) - y * Math.sin(theta);
    xy[1] = x * Math.sin(theta) + y * Math.cos(theta);
    return xy;
}

export function rotateAboutPoint(xy, originX, originY, theta, rad = false) {
    xy = translate(xy, -originX, -originY);
    xy = rotate(xy, theta, rad);
    xy = translate(xy, originX, originY);
    return xy;
}

export class Shape {
    constructor(
        origin,
        points,
        color,
        lineWidth,
        fillColor,
        shadowColor,
        shadowBlur
    ) {
        this._origin = origin;
        this._points = points;
        this._color = color == undefined ? "black" : color;
        this._lineWidth = lineWidth == undefined ? 1 : lineWidth;

        this._fillColor = fillColor;
        this._shadowColor = shadowColor;
        this._shadowBlur = shadowBlur;
    }

    map(func) {
        this._origin = func(this._origin);
        this._points.map((xy, index) => func(xy, index));
        return this;
    }

    translate(x, y) {
        this._origin = translate(this._origin, x, y);
        this._points.map((xy) => translate(xy, x, y));
        return this;
    }

    scale(s) {
        this._origin = scale(this._origin, s);
        this._points.map((xy) => scale(xy, s));
        return this;
    }

    rotate(theta, rad = false) {
        this._origin = rotate(this._origin, theta, rad);
        this._points.map((xy) => rotate(xy, theta, rad));
        return this;
    }

    rotateAboutPoint(x, y, theta, rad = false) {
        this._origin = rotateAboutPoint(this._origin, x, y, theta, rad);
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

    get color() {
        return this._color;
    }
    set color(color) {
        if (color instanceof Color) {
            this._color = color.colorString;
        } else {
            this._color = color;
        }
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

export class Polygon extends Shape {
    constructor(points, color, lineWidth, fillColor) {
        super([0, 0], points, color, lineWidth, fillColor);
    }

    draw(ctx) {
        ctx.beginPath();

        ctx.strokeStyle = this._color;
        ctx.lineWidth = this._lineWidth;
        if (this._fillColor) {
            ctx.fillStyle = this._fillColor;
        }
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        }

        for (let [x, y] of this._points) {
            ctx.lineTo(x, y);
        }

        if (this._fillColor) {
            ctx.fill();
        } else {
            ctx.stroke();
        }

        return this;
    }
}

export class Arc extends Shape {
    constructor(
        originX,
        originY,
        radius,
        beginAngle,
        endAngle,
        color,
        lineWidth
    ) {
        super([originX, originY], [originX, originY], color, lineWidth);

        this._radius = radius;
        this._beginAngle = beginAngle;
        this._endAngle = endAngle;
    }

    draw(ctx) {
        ctx.beginPath();

        ctx.strokeStyle = this._color;
        ctx.lineWidth = this._lineWidth;
        if (this._fillColor) {
            ctx.fillStyle = this._fillColor;
        }
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        }

        ctx.arc(
            this.originX,
            this.originY,
            this._radius,
            this._beginAngle,
            this._endAngle
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

export class FilledPolygon extends Polygon {
    constructor(points, fillColor) {
        super(points, undefined, undefined, fillColor);
    }
}

export class Rectangle extends Polygon {
    constructor(leftX, leftY, width, height, fillColor) {
        let points = [
            [leftX, leftY],
            [leftX + width, leftY],
            [leftX + width, leftY + height],
            [leftX, leftY + height],
            [leftX, leftY]
        ];
        super(points, undefined, undefined, fillColor);
        this._origin = [leftX, leftY];

        this._width = width;
        this._height = height;
    }

    get height() {
        return this._height;
    }
    set height(height) {
        this._points[2][1] = this.originY + height;
        this._points[3][1] = this.originY + height;
        this._height = height;
    }

    get width() {
        return this._width;
    }
    set width(width) {
        this._points[1][0] = this.originX + width;
        this._points[2][0] = this.originX + width;
        this._width = width;
    }
}

export class Mesh {
    constructor(...shapes) {
        this.shapes = shapes;
    }

    add(shape) {
        this.shapes.push(shape);
        return this;
    }

    draw(ctx) {
        for (let shape of this.shapes) {
            shape.draw(ctx);
        }
        return this;
    }

    translate(x, y) {
        for (let shape of this.shapes) {
            shape.translate(x, y);
        }
        return this;
    }

    scale(s) {
        for (let shape of this.shapes) {
            shape.scale(s);
        }
        return this;
    }

    rotate(theta, rad = false) {
        for (let shape of this.shapes) {
            shape.rotate(theta, rad);
        }
        return this;
    }

    rotateAboutPoint(x, y, theta, rad = false) {
        for (let shape of this.shapes) {
            shape.rotateAboutPoint(x, y, theta, rad);
        }
        return this;
    }
}

export function generateGradient(ctx, colorStops, x0, y0, x1, y1) {
    let gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    for (let [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}

export function generateGradientWrapper(canvas, colorStops) {
    let ctx = canvas.getContext("2d");
    let gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    for (let [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}
