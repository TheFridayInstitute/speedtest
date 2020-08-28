import { Color } from "./colors.js";
import { rotate, translate, scale, rotateAboutPoint, slerpPoints, lerp } from "./math.js";
class Canvas {
    constructor(canvasEl, ctx, origin) {
        this.canvasEl = canvasEl;
        this.ctx = ctx;
        this._origin = origin;
    }
    map(func) {
        this._origin = func(this._origin);
        return this;
    }
    translate(x, y) {
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
class Shape {
    constructor(points, color, lineWidth, fillColor, shadowColor, shadowBlur) {
        this._points = points;
        this._color = color == undefined ? "black" : color;
        this._lineWidth = lineWidth == undefined ? 1 : lineWidth;
        this._fillColor = fillColor;
        this._shadowColor = shadowColor;
        this._shadowBlur = shadowBlur;
    }
    map(func) {
        this._points.map((xy, index) => func(xy, index));
        return this;
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
    get centroid() {
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
        if (color instanceof Color) {
            //@ts-ignore
            // TODO: fix.
            this._color = color.colorString;
        }
        else {
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
class Polygon extends Shape {
    constructor(points, color, lineWidth, fillColor) {
        super(points, color, lineWidth, fillColor);
    }
    draw(ctx, t) {
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
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        }
        else {
            ctx.shadowColor = "black";
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        }
        else {
            ctx.shadowBlur = 0;
        }
        for (const [x, y] of this._points) {
            ctx.lineTo(x + originX, originY + y);
        }
        if (this._fillColor) {
            ctx.fill();
        }
        else {
            ctx.stroke();
        }
        return this;
    }
}
class Arc extends Shape {
    constructor(originX, originY, radius, beginAngle, endAngle, color, lineWidth) {
        super([[originX, originY]], color, lineWidth);
        this._radius = radius;
        this._beginAngle = beginAngle;
        this._endAngle = endAngle;
    }
    draw(ctx, t) {
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
        if (this._shadowColor) {
            ctx.shadowColor = this._shadowColor;
        }
        else {
            ctx.shadowColor = "black";
        }
        if (this._shadowBlur) {
            ctx.shadowBlur = this._shadowBlur;
        }
        else {
            ctx.shadowBlur = 0;
        }
        ctx.arc(this.points[0][0] + originX, this.points[0][1] + originY, this._radius, this._beginAngle, this._endAngle);
        if (this._fillColor) {
            ctx.fill();
        }
        else {
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
class Rectangle extends Polygon {
    constructor(leftX, leftY, width, height, fillColor) {
        const points = [
            [leftX, leftY],
            [leftX + width, leftY],
            [leftX + width, leftY + height],
            [leftX, leftY + height]
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
class Mesh {
    constructor(...shapes) {
        this.shapes = shapes;
    }
    add(shape) {
        this.shapes.push(shape);
        return this;
    }
    draw(ctx, t) {
        for (const shape of this.shapes) {
            shape.draw(ctx, t);
        }
        return this;
    }
    map(func) {
        let i = 0;
        for (const shape of this.shapes) {
            func(shape, i++);
        }
        return this;
    }
    translate(x, y) {
        for (const shape of this.shapes) {
            shape.translate(x, y);
        }
        return this;
    }
    scale(s) {
        for (const shape of this.shapes) {
            shape.scale(s);
        }
        return this;
    }
    rotate(theta, rad = false) {
        for (const shape of this.shapes) {
            shape.rotate(theta, rad);
        }
        return this;
    }
    rotateAboutPoint(x, y, theta, rad = false) {
        for (const shape of this.shapes) {
            shape.rotateAboutPoint(x, y, theta, rad);
        }
        return this;
    }
}
function roundedArc(originX, originY, radius, beginAngle, endAngle, color, lineWidth) {
    const slump = -0.0;
    const outerEdge = radius + lineWidth / 2;
    const barHeight = 0.05;
    const barWidth = lineWidth;
    const base = [
        [0, barHeight],
        [barWidth, barHeight]
    ];
    const slerps = slerpPoints(base[0], base[1]);
    const points = [...slerps];
    let theta = beginAngle;
    const delta = (barHeight * 2) / radius;
    theta += delta;
    const startCap = new Polygon(points, null, null, color);
    const arc = new Arc(originX, originY, radius, theta + slump, 0, color, lineWidth);
    const endCap = new Polygon(
    // Hack to return a copy of the original array.
    JSON.parse(JSON.stringify(points)), null, null, color);
    startCap.translate(originX, originY);
    endCap.translate(originX, originY);
    const x = outerEdge * Math.cos(theta);
    const y = outerEdge * Math.sin(theta);
    startCap.scale(-1).rotate(theta, true).translate(x, y);
    const roundedArcMesh = new Mesh(endCap, arc, startCap);
    roundedArcMesh.draw = function (ctx, t) {
        let theta = lerp(t, beginAngle, endAngle - 2 * delta);
        let theta2 = theta;
        if (theta >= beginAngle - delta + slump) {
            if (theta >= endAngle - delta) {
                theta2 = endAngle - delta + slump;
                theta = endAngle - delta;
            }
            else {
                theta2 = theta + delta + slump;
                theta += delta;
            }
        }
        else {
            theta2 = theta;
        }
        const x = outerEdge * Math.cos(theta2);
        const y = outerEdge * Math.sin(theta2);
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
        return this;
    };
    return roundedArcMesh;
}
function setRoundedArcColor(roundedArc, color) {
    roundedArc.map((shape) => {
        if (shape instanceof Arc) {
            shape.color = color;
        }
        else {
            shape.fillColor = color;
        }
    });
}
function roundedRectangle(leftX, leftY, width, height, fillColor) {
    const slump = -0.3;
    const r = Math.abs((leftY - height) / 2);
    const leftSide = [
        [leftX, leftY],
        [leftX, leftY - height]
    ];
    const rightSide = [
        [leftX + width, leftY],
        [leftX + width, leftY - height]
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
function generateGradient(canvas, colorStops, x0, y0, x1, y1) {
    x0 = x0 == null ? 0 : x0;
    y0 = y0 == null ? 0 : y0;
    x1 = x1 == null ? canvas.width : x1;
    y1 = y1 == null ? 0 : y1;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}
function progressBarIntervals(leftX, leftY, width, height, colors) {
    const shapes = [];
    let step = 0;
    const w = width / colors.length - height / colors.length;
    let i = 0;
    for (const color of colors) {
        const tw = w + height;
        const rRect = roundedRectangle(leftX, leftY, tw, height, color);
        rRect.translate(-width / 2 + tw / 2 + step, 0);
        shapes.push(rRect);
        step += w;
        i += 1;
    }
    const intervalMesh = new Mesh(...shapes);
    intervalMesh.draw = function (ctx, t) {
        const n = this.shapes.length;
        const step = 1 / n;
        let s = t;
        let v = 0;
        for (const shape of this.shapes) {
            if (s > 0) {
                if (s - step > 0) {
                    v = 1;
                }
                else {
                    v = s / step;
                }
                shape.draw(ctx, v);
                s -= step;
            }
            else {
                break;
            }
        }
        return this;
    };
    return intervalMesh;
}
export { Canvas, progressBarIntervals, roundedArc, roundedRectangle, setRoundedArcColor, generateGradient, Mesh, Rectangle, Arc, Polygon, Shape };
//# sourceMappingURL=canvas.js.map