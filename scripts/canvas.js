import { Color } from "./colors.js";

import {
    rotate,
    translate,
    scale,
    rotateAboutPoint,
    slerpPoints,
    lerp,
    sum,
} from "./math.js";

export class Canvas {
    constructor(canvasEl, ctx, origin) {
        this.canvasEl = canvasEl;
        this.ctx = ctx;
        this._origin = origin;
    }

    map(func) {
        if (y === undefined) {
            y = x[1];
            x = x[0];
        }
        this._origin = func(this._origin);
        return this;
    }

    translate(x, y) {
        if (y === undefined) {
            y = x[1];
            x = x[0];
        }
        this._origin = translate(this._origin, x, y);
        return this;
    }

    scale(s) {
        this._origin = scale(this._origin, s);
        return this;
    }

    rotate(theta, rad = false) {
        this._origin = rotate(this._origin, theta, rad);
        return this;
    }

    rotateAboutPoint(x, y, theta, rad = false) {
        if (y === undefined) {
            y = x[1];
            x = x[0];
        }
        this._origin = rotateAboutPoint(this._origin, x, y, theta, rad);
        return this;
    }

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

export class Shape {
    constructor(points, color, lineWidth, fillColor, shadowColor, shadowBlur) {
        this._points = points;
        this._color = color == undefined ? "black" : color;
        this._lineWidth = lineWidth == undefined ? 1 : lineWidth;

        this._fillColor = fillColor;
        this._shadowColor = shadowColor;
        this._shadowBlur = shadowBlur;
    }

    map(func) {
        if (y === undefined) {
            y = x[1];
            x = x[0];
        }
        this._points.map((xy, index) => func(xy, index));
        return this;
    }

    translate(x, y) {
        if (y === undefined) {
            y = x[1];
            x = x[0];
        }
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
        if (y === undefined) {
            y = x[1];
            x = x[0];
        }
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

    get centroid() {
        let cX = 0;
        let cY = 0;
        for (let [x, y] of this._points) {
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
        super(points, color, lineWidth, fillColor);
    }

    draw(ctx) {
        let originX = 0;
        let originY = 0;

        if (ctx instanceof Canvas) {
            let canvas = ctx;
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
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        } else {
            ctx.shadowColor = "black";
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        } else {
            ctx.shadowBlur = 0;
        }

        for (let [x, y] of this._points) {
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
        super([[originX, originY]], color, lineWidth);

        this._radius = radius;
        this._beginAngle = beginAngle;
        this._endAngle = endAngle;
    }

    draw(ctx, t) {
        let originX = 0;
        let originY = 0;

        if (ctx instanceof Canvas) {
            let canvas = ctx;
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
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        } else {
            ctx.shadowColor = "black";
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.arc(
            this.points[0][0] + originX,
            this.points[0][1] + originY,
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

export class Rectangle extends Polygon {
    constructor(leftX, leftY, width, height, fillColor) {
        let points = [
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

export class Text extends Shape {
    constructor(text, x, y, font) {
        super([[x, y]], undefined, undefined, undefined);
        this.text = text;
        this.font = font;
    }

    draw(ctx, t) {
        let originX = 0;
        let originY = 0;

        if (ctx instanceof Canvas) {
            let canvas = ctx;
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
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        } else {
            ctx.shadowColor = "black";
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.font = this.font;
        ctx.fillText(
            this.text,
            this._points[0][0] + originX,
            this._points[0][1] + originY
        );

        if (this._fillColor) {
            ctx.fill();
        } else {
            ctx.stroke();
        }

        return this;
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

    draw(ctx, t) {
        for (let shape of this.shapes) {
            shape.draw(ctx, t);
        }
        return this;
    }

    map(func) {
        let i = 0;
        for (let shape of this.shapes) {
            func(shape, i++);
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

export function roundedArc(
    originX,
    originY,
    radius,
    beginAngle,
    endAngle,
    color,
    lineWidth
) {
    let slump = -0.0003;
    let outerEdge = radius + lineWidth / 2;

    let barHeight = 0.05;
    let barWidth = lineWidth;

    let base = [
        [0, barHeight],
        [barWidth, barHeight],
    ];

    let slerps = slerpPoints(base[0], base[1]);
    let points = [...slerps];

    let theta = beginAngle;
    let delta = (barHeight * 2) / radius;

    theta += delta;

    let startCap = new Polygon(points, null, null, color);
    let arc = new Arc(
        originX,
        originY,
        radius,
        theta + slump,
        0,
        color,
        lineWidth
    );
    let endCap = new Polygon(
        // Hack to return a copy of the original array.
        JSON.parse(JSON.stringify(points)),
        null,
        null,
        color
    );

    startCap.translate(originX, originY);
    endCap.translate(originX, originY);

    let x = outerEdge * Math.cos(theta);
    let y = outerEdge * Math.sin(theta);

    startCap.scale(-1).rotate(theta, true).translate(x, y);

    let roundedArcMesh = new Mesh(endCap, arc, startCap);

    roundedArcMesh.draw = function (ctx, t) {
        let theta = lerp(t, beginAngle, endAngle - 2 * delta);
        let theta2 = theta;

        if (theta >= beginAngle - delta + slump) {
            if (theta >= endAngle - delta) {
                theta2 = endAngle - delta + slump;
                theta = endAngle - delta;
            } else {
                theta2 = theta + delta + slump;
                theta += delta;
            }
        } else {
            theta2 = theta;
        }

        let x = outerEdge * Math.cos(theta2);
        let y = outerEdge * Math.sin(theta2);

        this.shapes[0]
            .translate(-barWidth, 0)
            .rotate(theta2, true)
            .translate(x, y)

            .draw(ctx)
            .translate(-x, -y)
            .rotate(-theta2, true)
            .translate(barWidth, 0);

        this.shapes[1].endAngle = theta;
        this.shapes[1].draw(ctx);

        this.shapes[2].draw(ctx);
    };

    return roundedArcMesh;
}

export function setRoundedArcColor(roundedArc, color) {
    roundedArc.map((shape, index) => {
        if (shape instanceof Arc) {
            shape.color = color;
        } else {
            shape.fillColor = color;
        }
    });
}

export function roundedRectangle(leftX, leftY, width, height, fillColor) {
    let slump = -0.3;

    let r = Math.abs((leftY - height) / 2);

    let leftSide = [
        [leftX, leftY],
        [leftX, leftY - height],
    ];

    let rightSide = [
        [leftX + width, leftY],
        [leftX + width, leftY - height],
    ];

    width -= 2 * r;

    let slerpsLeft = slerpPoints(leftSide[0], leftSide[1], 1);
    let slerpsRight = slerpPoints(rightSide[1], rightSide[0], -1);

    let startCap = new Polygon(slerpsLeft, null, null, fillColor);
    let bar = new Rectangle(leftX, leftY, width, height, fillColor);
    let endCap = new Polygon(slerpsRight, null, null, fillColor);

    let shiftX = -width / 2;
    let shiftY = height / 2;

    startCap.translate(shiftX - slump, shiftY);
    endCap.translate(shiftX - 2 * r, shiftY);
    bar.translate(shiftX, -shiftY);

    let roundedBarMesh = new Mesh(startCap, bar, endCap);

    let [cX, cY] = bar.centroid;

    roundedBarMesh.draw = function (ctx, t) {
        let w = t * width;

        let [tcX, tcY] = bar.centroid;
        let sX = tcX - cX - bar.width / 2;
        let sY = tcY - cY - bar.height / 2;

        bar.translate(-sX, -sY);
        bar.width = w;
        bar.translate(sX, sY);

        t = -(1 - t) * width + slump;

        endCap.translate(t, 0);
        for (let shape of this.shapes) {
            shape.draw(ctx);
        }
        endCap.translate(-t, 0);
    };

    return roundedBarMesh;
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

export function progressBarIntervals(leftX, leftY, width, height, colors) {
    let shapes = [];
    let step = 0;
    let w = width / colors.length - height / colors.length;

    let i = 0;
    for (let color of colors) {
        let tw = w + height;

        let rRect = roundedRectangle(leftX, leftY, tw, height, color);
        rRect.translate([-width / 2 + tw / 2 + step, 0]);
        shapes.push(rRect);

        step += w;
        i += 1;
    }

    let intervalMesh = new Mesh(...shapes);

    intervalMesh.draw = function (ctx, t) {
        let n = this.shapes.length;
        let step = 1 / n;
        let s = t;
        let v = 0;

        for (let shape of this.shapes) {
            if (s > 0) {
                if (s - step > 0) {
                    v = 1;
                } else {
                    v = s / step;
                }
                shape.draw(ctx, v);
                s -= step;
            } else {
                break;
            }
        }
    };
    return intervalMesh;
}
