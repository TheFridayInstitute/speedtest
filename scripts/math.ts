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
    let x = xy[0];
    let y = xy[1];
    xy[0] = x * Math.cos(theta) - y * Math.sin(theta);
    xy[1] = x * Math.sin(theta) + y * Math.cos(theta);
    return xy;
}

export function rotateAboutPoint(
    xy: number[],
    originX: number,
    originY: number,
    theta: number,
    rad = false
) {
    xy = translate(xy, -originX, -originY);
    xy = rotate(xy, theta, rad);
    xy = translate(xy, originX, originY);
    return xy;
}

export function distance(
    xy1: number[],
    xy2: number[],
    metric?: (xy1: number[], xy2: number[]) => number
) {
    if (metric === undefined) {
        metric = function (xy1: number[], xy2: number[]) {
            let s = 0;

            xy1.forEach(function (value, index) {
                s += Math.pow(value - xy2[index], 2);
            });

            return Math.sqrt(s);
        };
    }
    return metric(xy1, xy2);
}

export function dot(xy1, xy2) {
    let s = 0;
    xy1.forEach(function (value, index) {
        s += value * xy2[index];
    });
    return s;
}

export function sum(arr, key) {
    if (key === undefined) {
        key = function (value) {
            return value;
        };
    }
    let s = 0;
    arr.forEach(function (value) {
        s += key(value);
    });
    return s;
}

export function mag(xy1) {
    let s = 0;
    xy1.forEach(function (value, index) {
        s += Math.pow(value, 2);
    });
    return Math.sqrt(s);
}

export function angle(xy1, xy2) {
    let m = mag(xy1) * mag(xy2);
    let d = dot(xy1, xy2);
    return Math.acos(d / m);
}

export function slerpPoints(xy1: number[], xy2: number[], neg = 1) {
    let minX = Math.min(xy1[0], xy2[0]);
    let minY = Math.min(xy1[1], xy2[1]);

    let midpoint = [
        Math.abs(xy2[0] - xy1[0]) / 2 + minX,
        Math.abs(xy2[1] - xy1[1]) / 2 + minY
    ];

    let r = distance(midpoint, xy2);

    let unit;

    if (xy1[1] > xy2[1]) {
        unit = [-1, 0];
    } else {
        unit = [1, 0];
    }

    let v1 = [xy1[0] - midpoint[0], xy1[1] - midpoint[1]];
    let v2 = [xy2[0] - midpoint[0], xy2[1] - midpoint[1]];

    let alpha0 = 2 * Math.PI - angle(unit, v1);
    let alpha1 = angle(unit, v2);

    if (neg === 1) {
        let t = alpha0;
        alpha0 = alpha1;
        alpha1 = t;
    }

    let delta = 0.1;
    let points = [];

    for (let t = 0; t <= 1; t += delta) {
        let v = lerp(t, alpha0, alpha1);
        points.push([
            neg * r * Math.cos(v) + midpoint[0],
            r * Math.sin(v) + midpoint[1]
        ]);
    }
    return points;
}

export function clamp(x: number, lowerLimit: number, upperLimit: number) {
    if (x < lowerLimit) {
        return lowerLimit;
    } else if (x > upperLimit) {
        return upperLimit;
    }
    return x;
}

export function normalize(x0: number, min: number, max: number) {
    return (x0 - min) / (max - min);
}

export function DeCasteljau(t: number, points: number[]) {
    const dp: Map<string, number> = new Map();

    const inner = function (
        t: number,
        points: number[],
        ix1: number,
        ix2: number,
        n: number
    ) {
        let k = `${n}${ix1}${ix2}`;

        if (dp.has(k)) {
            return dp.get(k);
        }

        let b0: number, b1: number;

        if (n == 1) {
            b0 = points[ix1];
            b1 = points[ix2];
        } else {
            n--;
            b0 = inner(t, points, ix1, ix2, n);
            b1 = inner(t, points, ix2, ix2 + 1, n);
        }
        let v = (1 - t) * b0 + t * b1;
        dp.set(k, v);

        return v;
    };
    return inner(t, points, 0, 1, points.length - 1);
}

export function cubicBezier(t: number, x1: number, y1: number, x2: number, y2: number) {
    return [DeCasteljau(t, [0, x1, x2, 1]), DeCasteljau(t, [0, y1, y2, 1])];
}

export function easeInBounce(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    t = cubicBezier(t / duration, 0.09, 0.91, 0.5, 1.5)[1];
    return distance * t + from;
}

export function bounceInEase(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    t = cubicBezier(t / duration, 0.19, -0.53, 0.83, 0.67)[1];
    return distance * t + from;
}

export function easeInQuad(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    return distance * (t /= duration) * t + from;
}

export function easeOutQuad(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    return -distance * (t /= duration) * (t - 2) + from;
}

export function easeInOutQuad(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    if ((t /= duration / 2) < 1) return (distance / 2) * t * t + from;
    return (-distance / 2) * (--t * (t - 2) - 1) + from;
}

export function easeInCubic(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    return distance * (t /= duration) * t * t + from;
}

export function easeOutCubic(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    return distance * ((t = t / duration - 1) * t * t + 1) + from;
}

export function easeInOutCubic(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    if ((t /= duration / 2) < 1) return (distance / 2) * t * t * t + from;
    return (distance / 2) * ((t -= 2) * t * t + 2) + from;
}

export function smoothStep3(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    t /= duration;
    return distance * Math.pow(t, 2) * (3 - 2 * t) + from;
}

export function lerpIn(t: number, from: number, distance: number, duration: number) {
    return distance * (t /= duration) + from;
}

export function lerp(t: number, from: number, to: number) {
    return (1 - t) * from + t * to;
}

export function logerp(t: number, from: number, to: number) {
    from = from === 0 ? 1e-9 : from;
    let tt = from * Math.pow(to / from, t);
    return tt;
}

export function interpBezier(t: number, points: number[][]) {
    let x = points.map((xy) => xy[0]);
    let y = points.map((xy) => xy[1]);
    return [DeCasteljau(t, x), DeCasteljau(t, y)];
}

export function bounceInEaseHalf(
    t: number,
    from: number,
    distance: number,
    duration: number
) {
    let points = [
        [0, 0],
        [0.026, 1.746],
        [0.633, 1.06],
        [1, 0]
    ];
    t = interpBezier(t / duration, points)[1];
    return distance * t + from;
}

export function round(n: number, d: number, mode = 0) {
    let ten = Math.pow(10, d);
    let v = 0;
    if (mode === 0) {
        v = Math.round(n * ten);
    } else if (mode === 1) {
        v = Math.ceil(n * ten);
    } else if (mode === 2) {
        v = Math.floor(n * ten);
    }
    return v / ten;
}
