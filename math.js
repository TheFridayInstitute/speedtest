export function range(start, end, step = 1) {
    const len = Math.floor((end - start) / step) + 1;
    return Array(len)
        .fill()
        .map((_, idx) => start + idx * step);
}

export function clamp(x, lowerLimit, upperLimit) {
    if (x < lowerLimit) {
        return lowerLimit;
    } else if (x > upperLimit) {
        return upperLimit;
    }
    return x;
}

export function normalize(x0, min, max) {
    return (x0 - min) / (max - min);
}

export function DeCasteljau(t, points) {
    let dp = new Map();

    function _DeCasteljau(t, points, ix1, ix2, n) {
        let k = `${n}${ix1}${ix2}`;

        if (dp.has(k)) {
            return dp.get(k);
        }

        let b0, b1;

        if (n == 1) {
            b0 = points[ix1];
            b1 = points[ix2];
        } else {
            n--;
            b0 = _DeCasteljau(t, points, ix1, ix2, n);
            b1 = _DeCasteljau(t, points, ix2, ix2 + 1, n);
        }
        let v = (1 - t) * b0 + t * b1;
        dp.set(k, v);

        return v;
    }
    return _DeCasteljau(t, points, 0, 1, points.length - 1);
}

export function cubicBezier(t, x1, y1, x2, y2) {
    return [DeCasteljau(t, [0, x1, x2, 1]), DeCasteljau(t, [0, y1, y2, 1])];
}

export function easeInBounce(t, from, distance, duration) {
    t = cubicBezier(t / duration, 0.09, 0.91, 0.5, 1.5)[1];
    return distance * t + from;
}

export function bounceInEase(t, from, distance, duration) {
    t = cubicBezier(t / duration, 0.19, -0.53, 0.83, 0.67)[1];
    return distance * t + from;
}

export function easeInQuad(t, from, distance, duration) {
    return distance * (t /= duration) * t + from;
}

export function easeOutQuad(t, from, distance, duration) {
    return -distance * (t /= duration) * (t - 2) + from;
}

export function easeInOutQuad(t, from, distance, duration) {
    if ((t /= duration / 2) < 1) return (distance / 2) * t * t + from;
    return (-distance / 2) * (--t * (t - 2) - 1) + from;
}

export function easeInCubic(t, from, distance, duration) {
    return distance * (t /= duration) * t * t + from;
}

export function easeOutCubic(t, from, distance, duration) {
    return distance * ((t = t / duration - 1) * t * t + 1) + from;
}

export function easeInOutCubic(t, from, distance, duration) {
    if ((t /= duration / 2) < 1) return (distance / 2) * t * t * t + from;
    return (distance / 2) * ((t -= 2) * t * t + 2) + from;
}

export function smoothStep3(t, from, distance, duration) {
    t /= duration;
    return distance * Math.pow(t, 2) * (3 - 2 * t) + from;
}

export function lerpIn(t, from, distance, duration) {
    return distance * (t /= duration) + from;
}

export function lerp(v0, v1, t) {
    return (1 - t) * v0 + t * v1;
}

export function logerp(v0, v1, t) {
    v0 = v0 === 0 ? 1e-9 : v0;
    let tt = v0 * Math.pow(v1 / v0, t);
    return tt;
}

export function round(n, d, mode = 0) {
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
