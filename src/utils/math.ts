/**
 * 2D geometry utilities for canvas rendering.
 *
 * Interpolation (lerp, clamp, scale, easing) lives in @mkbabb/keyframes.js.
 */

import { lerp } from "@mkbabb/keyframes.js";

export function translate(xy: number[], tX: number, tY: number) {
    xy[0] += tX;
    xy[1] += tY;
    return xy;
}

export function scale(xy: number[], s: number) {
    xy[0] *= s;
    xy[1] *= s;
    return xy;
}

export function rotate(xy: number[], theta: number, rad = false) {
    if (!rad) {
        theta *= Math.PI / 180;
    }
    const x = xy[0];
    const y = xy[1];
    xy[0] = x * Math.cos(theta) - y * Math.sin(theta);
    xy[1] = x * Math.sin(theta) + y * Math.cos(theta);
    return xy;
}

export function rotateAboutPoint(
    xy: number[],
    originX: number,
    originY: number,
    theta: number,
    rad = false,
) {
    xy = translate(xy, -originX, -originY);
    xy = rotate(xy, theta, rad);
    xy = translate(xy, originX, originY);
    return xy;
}

export function distance(xy1: number[], xy2: number[]) {
    let s = 0;
    for (let i = 0; i < xy1.length; i++) {
        s += (xy1[i] - xy2[i]) ** 2;
    }
    return Math.sqrt(s);
}

export function dot(xy1: number[], xy2: number[]) {
    let s = 0;
    for (let i = 0; i < xy1.length; i++) {
        s += xy1[i] * xy2[i];
    }
    return s;
}

export function mag(xy: number[]) {
    let s = 0;
    for (let i = 0; i < xy.length; i++) {
        s += xy[i] ** 2;
    }
    return Math.sqrt(s);
}

export function angle(xy1: number[], xy2: number[]) {
    return Math.acos(dot(xy1, xy2) / (mag(xy1) * mag(xy2)));
}

/** Generate arc points between two 2D points via angular interpolation. */
export function slerpPoints(xy1: number[], xy2: number[], neg = 1) {
    const minX = Math.min(xy1[0], xy2[0]);
    const minY = Math.min(xy1[1], xy2[1]);

    const midpoint = [
        Math.abs(xy2[0] - xy1[0]) / 2 + minX,
        Math.abs(xy2[1] - xy1[1]) / 2 + minY,
    ];

    const r = distance(midpoint, xy2);
    const unit = xy1[1] > xy2[1] ? [-1, 0] : [1, 0];

    const v1 = [xy1[0] - midpoint[0], xy1[1] - midpoint[1]];
    const v2 = [xy2[0] - midpoint[0], xy2[1] - midpoint[1]];

    let alpha0 = 2 * Math.PI - angle(unit, v1);
    let alpha1 = angle(unit, v2);

    if (neg === 1) {
        [alpha0, alpha1] = [alpha1, alpha0];
    }

    const delta = 0.1;
    const points: number[][] = [];

    for (let t = 0; t <= 1; t += delta) {
        const v = lerp(t, alpha0, alpha1);
        points.push([neg * r * Math.cos(v) + midpoint[0], r * Math.sin(v) + midpoint[1]]);
    }
    return points;
}
