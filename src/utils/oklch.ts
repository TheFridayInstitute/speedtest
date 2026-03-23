// sRGB transfer functions
const SRGB_GAMMA = 2.4;
const SRGB_OFFSET = 0.055;
const SRGB_SLOPE = 12.92;
const SRGB_TRANSITION = 0.04045;
const SRGB_LINEAR_TRANSITION = SRGB_TRANSITION / SRGB_SLOPE;

function srgbToLinear(channel: number): number {
    const sign = channel < 0 ? -1 : 1;
    const abs = channel * sign;
    if (abs <= SRGB_LINEAR_TRANSITION) return channel / SRGB_SLOPE;
    return sign * ((abs + SRGB_OFFSET) / (1 + SRGB_OFFSET)) ** SRGB_GAMMA;
}

function linearToSrgb(channel: number): number {
    const sign = channel < 0 ? -1 : 1;
    const abs = channel * sign;
    if (abs <= SRGB_LINEAR_TRANSITION) return channel * SRGB_SLOPE;
    return sign * ((1 + SRGB_OFFSET) * abs ** (1 / SRGB_GAMMA) - SRGB_OFFSET);
}

// Matrix constants (Ottosson's canonical values)
const LMS_TO_LINEAR_SRGB = [
    +4.0767416621, -3.3077115913, +0.2309699292,
    -1.2684380046, +2.6097574011, -0.3413193965,
    -0.0041960863, -0.7034186147, +1.7076147010,
];

const LINEAR_SRGB_TO_LMS = [
    0.4122214708, 0.5363325363, 0.0514459929,
    0.2119034982, 0.6806995451, 0.1073969566,
    0.0883024619, 0.2817188376, 0.6299787005,
];

const OKLAB_TO_LMS_COEFF = {
    l: [1.0, +0.3963377774, +0.2158037573],
    m: [1.0, -0.1055613458, -0.0638541728],
    s: [1.0, -0.0894841775, -1.2914855480],
};

export function clampNum(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

export function srgbToOKLab(r: number, g: number, b: number): [number, number, number] {
    const rLin = srgbToLinear(r);
    const gLin = srgbToLinear(g);
    const bLin = srgbToLinear(b);
    const l_ = Math.cbrt(LINEAR_SRGB_TO_LMS[0] * rLin + LINEAR_SRGB_TO_LMS[1] * gLin + LINEAR_SRGB_TO_LMS[2] * bLin);
    const m_ = Math.cbrt(LINEAR_SRGB_TO_LMS[3] * rLin + LINEAR_SRGB_TO_LMS[4] * gLin + LINEAR_SRGB_TO_LMS[5] * bLin);
    const s_ = Math.cbrt(LINEAR_SRGB_TO_LMS[6] * rLin + LINEAR_SRGB_TO_LMS[7] * gLin + LINEAR_SRGB_TO_LMS[8] * bLin);
    return [
        0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
        1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
        0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
    ];
}

export function oklabToLinearSRGB(L: number, a: number, b: number): [number, number, number] {
    const l_ = L + OKLAB_TO_LMS_COEFF.l[1] * a + OKLAB_TO_LMS_COEFF.l[2] * b;
    const m_ = L + OKLAB_TO_LMS_COEFF.m[1] * a + OKLAB_TO_LMS_COEFF.m[2] * b;
    const s_ = L + OKLAB_TO_LMS_COEFF.s[1] * a + OKLAB_TO_LMS_COEFF.s[2] * b;
    const l = l_ * l_ * l_;
    const m = m_ * m_ * m_;
    const s = s_ * s_ * s_;
    return [
        LMS_TO_LINEAR_SRGB[0] * l + LMS_TO_LINEAR_SRGB[1] * m + LMS_TO_LINEAR_SRGB[2] * s,
        LMS_TO_LINEAR_SRGB[3] * l + LMS_TO_LINEAR_SRGB[4] * m + LMS_TO_LINEAR_SRGB[5] * s,
        LMS_TO_LINEAR_SRGB[6] * l + LMS_TO_LINEAR_SRGB[7] * m + LMS_TO_LINEAR_SRGB[8] * s,
    ];
}

export function rawOklabToOklch(L: number, a: number, b: number): [number, number, number] {
    const C = Math.sqrt(a * a + b * b);
    let H = Math.atan2(b, a) * (180 / Math.PI);
    if (H < 0) H += 360;
    return [L, C, H];
}

export function rawOklchToOklab(L: number, C: number, H: number): [number, number, number] {
    const hRad = (H * Math.PI) / 180;
    return [L, C * Math.cos(hRad), C * Math.sin(hRad)];
}

export function oklabToRgb255(L: number, a: number, b: number): [number, number, number] {
    const [rLin, gLin, bLin] = oklabToLinearSRGB(L, a, b);
    return [
        Math.round(clampNum(linearToSrgb(rLin), 0, 1) * 255),
        Math.round(clampNum(linearToSrgb(gLin), 0, 1) * 255),
        Math.round(clampNum(linearToSrgb(bLin), 0, 1) * 255),
    ];
}

export function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
    const [L, a, b_] = srgbToOKLab(r / 255, g / 255, b / 255);
    return rawOklabToOklch(L, a, b_);
}

export function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
    const [la, a, b] = rawOklchToOklab(L, C, H);
    return oklabToRgb255(la, a, b);
}
