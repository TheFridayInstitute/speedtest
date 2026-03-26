/**
 * DOM and formatting utilities.
 *
 * Unit conversion and color parsing delegate to @mkbabb/value.js.
 */

import { convertToPixels } from "@mkbabb/value.js";
import { RGBColor } from "@mkbabb/value.js";

/** Strip trailing zeros from a numeric string: "22.0" → "22", "5.50" → "5.5" */
export function stripTrailingZeros(s: string): string {
    if (!s.includes(".")) return s;
    return s.replace(/\.?0+$/, "");
}

/** Convert a CSS length string (e.g. "1.5em", "16px") to pixels. */
export function emToPixels(value: string): number {
    value = value.toLowerCase().trim();
    const num = parseFloat(value);
    if (isNaN(num)) return 0;

    if (value.endsWith("px")) return num;
    if (value.endsWith("em")) return convertToPixels(num, "em");
    if (value.endsWith("rem")) return convertToPixels(num, "rem");

    // Bare number — assume em
    return convertToPixels(num, "em");
}

/** Get the computed value of a CSS custom property. */
export function getComputedVariable(v: string, el = document.documentElement): string {
    return window.getComputedStyle(el).getPropertyValue(v);
}

/**
 * Generate color stop array from CSS custom properties.
 * Reads --{colorName}-0, --{colorName}-1, etc. from the root element.
 */
export function generateColorStops(
    colorName: string,
    step = 0.5,
): Array<[number, string]> {
    const stops = Math.floor(1 / step) + 1;
    return Array(stops)
        .fill(0)
        .map((_, index) => {
            const stop = index * step;
            const color: string = getComputedVariable(`--${colorName}-${index}`);
            return [stop, color] as [number, string];
        });
}

/**
 * Create a semi-transparent version of a color stop.
 * Parses the CSS color via value.js and applies 0.3 alpha.
 */
export function generateInnerColorStops(
    value: [number, string],
): [number, string] {
    const [stop, color] = value;

    try {
        const rgb = RGBColor.fromString(color.trim());
        return [stop, `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, 0.3)`];
    } catch {
        // Fallback: canvas-based color resolution for formats value.js can't parse
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = color.trim();
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        return [stop, `rgba(${r}, ${g}, ${b}, 0.3)`];
    }
}
