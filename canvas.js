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
    constructor(points, color, lineWidth, fillColor, shadowColor, shadowBlur) {
        this._points = points;
        this._color = color;
        this._lineWidth = lineWidth;

        this._fillColor = fillColor;
        this._shadowColor = shadowColor;
        this._shadowBlur = shadowBlur;
    }

    translate(x, y) {
        this._points.map((xy) => translate(xy, x, y));
        return this;
    }

    scale(s) {
        this._points.map((xy) => scale(xy, s));
        return this;
    }

    rotate(theta, rad = false) {
        this._points.map((xy) => rotate(xy, theta, rad));
        return this;
    }

    rotateAboutPoint(x, y, theta, rad = false) {
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
    constructor(points, fillColor) {
        super(points, undefined, undefined, fillColor);
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
        }

        ctx.closePath();
        return this;
    }
}

export class Arc extends Shape {
    constructor(x, y, radius, beginAngle, endAngle, color, lineWidth) {
        super([x, y], color, lineWidth);

        this._x = x;
        this._y = y;
        this._radius = radius;
        this._beginAngle = beginAngle;
        this._endAngle = endAngle;
    }

    draw(ctx) {
        ctx.beginPath();

        ctx.strokeStyle = this._color;
        ctx.lineWidth = this._lineWidth;
        if (this._fillColor !== undefined) {
            ctx.fillStyle = this._fillColor;
        }
        if (this._shadowColor !== undefined) {
            ctx.shadowColor = this._shadowColor;
        }
        if (this._shadowBlur !== undefined) {
            ctx.shadowBlur = this._shadowBlur;
        }

        ctx.arc(
            this._x,
            this._y,
            this._radius,
            this._beginAngle,
            this._endAngle
        );
        ctx.stroke();

        if (this._fillColor !== undefined) {
            ctx.fill();
        }

        return this;
    }

    get x() {
        return this._x;
    }
    set x(x) {
        this._x = y;
    }

    get y() {
        return this._y;
    }
    set y(y) {
        this._y = y;
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

export class Mesh {
    constructor(...shapes) {
        this.shapes = shapes;
    }

    add(shape) {
        this.shapes.push(shape);
    }

    draw(ctx) {
        for (let shape of this.shapes) {
            shape.draw(ctx);
        }
    }

    translate(x, y) {
        for (let shape of this.shapes) {
            shape.translate(x, y);
        }
    }

    scale(s) {
        for (let shape of this.shapes) {
            shape.scale(s);
        }
    }

    rotate(theta, rad = false) {
        for (let shape of this.shapes) {
            shape.rotate(theta, rad);
        }
    }

    rotateAboutPoint(x, y, theta, rad = false) {
        for (let shape of this.shapes) {
            shape.rotateAboutPoint(x, y, theta, rad);
        }
    }
}

export function generateGradient(ctx, x0, y0, x1, y1, colorStops) {
    let gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    for (let [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}
