/**
 * DOM and formatting utilities.
 */

/** Strip trailing zeros from a numeric string: "22.0" → "22", "5.50" → "5.5" */
export function stripTrailingZeros(s: string): string {
    if (!s.includes(".")) return s;
    return s.replace(/\.?0+$/, "");
}

/** Convert an em or px string value to pixels. */
export function emToPixels(em: string): number {
    em = em.toLowerCase();
    let emNumber = 1;

    if (em.indexOf("px") !== -1) {
        emNumber = parseFloat(em.split("px")[0]);
        return emNumber;
    } else if (em.indexOf("em") !== -1) {
        emNumber = parseFloat(em.split("em")[0]);
    }

    const fontSize = parseFloat(
        window
            .getComputedStyle(document.body)
            .getPropertyValue("font-size")
            .toLowerCase()
            .replace(/[a-z]/g, ""),
    );

    return emNumber * fontSize;
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
            const tmpColorName = `--${colorName}-${index}`;
            const color: string = getComputedVariable(tmpColorName);
            return [stop, color] as [number, string];
        });
}

/**
 * Create a semi-transparent version of a color stop.
 * Parses the color and applies 0.3 opacity for inner meter rings.
 */
export function generateInnerColorStops(
    value: [number, string],
): [number, string] {
    const [stop, color] = value;
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color.trim();
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [stop, `rgba(${r}, ${g}, ${b}, 0.3)`];
}
