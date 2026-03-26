/**
 * 2D geometry utilities for canvas rendering.
 *
 * Interpolation (lerp, clamp, scale, easing) lives in @mkbabb/keyframes.js.
 */

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
