import { clamp, lerp } from "./utils.js";
export { Color };

if (!String.prototype.splice) {
    /**
     * {JSDoc}
     *
     * The splice() method changes the content of a string by removing a range
     * of characters and/or adding new characters.
     *
     * @this {String}
     * @param {number} start Index at which to start changing the string.
     * @param {number} delCount An integer indicating the number of old chars to
     *   remove.
     * @param {string} newSubStr The String that is spliced in.
     * @return {string} A new string with the spliced substring.
     */
    String.prototype.splice = function(start, delCount, newSubStr) {
        return (
            this.slice(0, start) +
            newSubStr +
            this.slice(start + Math.abs(delCount))
        );
    };
}

function toBase(num, base) {
    let digits = [];
    while (num !== 0) {
        num = (num / base) >> 0;
        digits.push(num % base);
    }
    if (base === 10) {
        let based = 0;
        digits.forEach((value, index) => {
            based += value * Math.pow(10, index);
        });
        return based;
    } else {
        let based = "";
        digits.reverse().forEach((value, index) => {
            based += value;
        });
        return based;
    }
}

function hexToRGBA(num, alpha = 1) {
    let rgbInt = parseInt(num, 16);
    let r = (rgbInt >> 16) & 255;
    let g = (rgbInt >> 8) & 255;
    let b = rgbInt & 255;
    return [r, g, b, alpha];
}

function RGBAToHex(color) {
    let r, g, b, a;
    if (color.length == 3) {
        [r, g, b] = color;
    } else {
        [r, g, b, a] = color;
    }

    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function HSLAToRGBA(color) {
    let h, s, l, a;
    if (color.length == 3) {
        [h, s, l] = color;
    } else {
        [h, s, l, a] = color;
    }
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255),
        a || 0
    ];
}

function RGBAToHSLA(color) {
    let r, g, b, a;
    if (color.length == 3) {
        [r, g, b] = color;
    } else {
        [r, g, b, a] = color;
    }

    (r /= 255), (g /= 255), (b /= 255);

    var max = Math.max(r, g, b),
        min = Math.min(r, g, b);
    var h,
        s,
        l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }

    return [h, s, l, a];
}

function colorToRGBA(color) {
    let canvas = document.createElement("canvas");
    canvas.height = 1;
    canvas.width = 1;
    let ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    return Array.from(ctx.getImageData(0, 0, 1, 1).data);
}

function RGBAToString(color) {
    return ` rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]}) `;
}

function parseColor(color) {
    let pcolor;

    if (typeof color === "string") {
        let isRGB = color.indexOf("rgb") !== -1;
        let isHSL = color.indexOf("hsl") !== -1;
        let isHex = color[0] === "#";

        if (isHex) {
            color = color.slice(1);

            if (color.length == 3) {
                let len = color.length;
                let i = 0;
                do {
                    let c = color[i];
                    color = color.splice(i, 0, c);
                    i += 2;
                } while (++len < 6);
            }
            pcolor = hexToRGBA(color);
        } else if (isRGB || isHSL) {
            let num = color.split("(")[1].split(")")[0];
            let pnum = num.split(",");
            if (pnum.length === undefined || 0) {
                pnum = num.split(" ");
                if (pnum.length === undefined || 0) {
                    throw new Error("Color is of an undefined type.");
                }
            }
            pcolor = pnum.map((value, index) => {
                value = parseInt(value);
                return value;
            });

            if (isHSL) {
                pcolor = HSLAToRGBA(pcolor);
            }
        } else {
            pcolor = colorToRGBA(color);
        }
    } else {
        pcolor = color;
    }

    if (pcolor instanceof Array) {
        let len = pcolor.length;
        let diff = 4 - len;

        if (diff > 0) {
            pcolor = pcolor.concat(new Array(diff).fill(1));
        } else if (diff < 0) {
            pcolor.length = 4;
        }
    } else {
        throw new Error("Color is of an undefined type.");
    }
    return pcolor;
}

function interpColor(colors, steps = 2, endPoints = true, interpFunc = lerp) {
    let palettes = new Array((colors.length - 1) * steps).fill(0);
    colors.forEach((value, index) => {
        colors[index] = parseColor(value);
    });
    let i = 0;
    for (let [n, color] of colors.entries()) {
        if (n < colors.length - 1) {
            let [r1, g1, b1, a1] = color;
            let [r2, g2, b2, a2] = colors[n + 1];

            for (let m = endPoints & (n === 0) ? 0 : 1; m <= steps; m++) {
                if (m === steps && n === colors.length - 2 && !endPoints) break;
                let t = m / steps;
                let ri = Math.ceil(interpFunc(r1, r2, t));
                let gi = Math.ceil(interpFunc(g1, g2, t));
                let bi = Math.ceil(interpFunc(b1, b2, t));
                let ai = interpFunc(a1, a2, t);
                ai = ai > 1 ? Math.ceil(ai) : ai;

                let colorString = ` rgba(${ri}, ${gi}, ${bi}, ${ai}) `;
                palettes[i++] = RGBAToHex(parseColor(colorString));
            }
        } else {
            break;
        }
    }
    return palettes;
}

class Color {
    constructor(colorString) {
        this.setColorFromString(colorString);
    }

    setColorFromString(colorString) {
        this.rgba = parseColor(colorString);
        this.hsla = RGBAToHSLA(this.rgba);
        this.hex = RGBAToHex(this.rgba);
        this.colorString = RGBAToString(this.rgba);
    }

    toHSLA() {
        return this.hsl;
    }

    fromHSLA(hsla) {
        this.rgba = HSLAToRGBA(hsla);
        this.hsla = hsla;
        this.hex = RGBAToHex(this.rgba);
        this.colorString = RGBAToString(this.rgba);
    }

    toRGBA() {
        return this.rgb;
    }

    fromRGBA(rgba) {
        this.rgba = rgba;
        this.hsla = RGBAToHSLA(rgba);
        this.hex = RGBAToHex(this.rgba);
        this.colorString = RGBAToString(this.rgba);
    }

    toHex() {
        return this.hex;
    }

    fromHEX(hex) {
        this.rgba = hexToRGBA(hex);
        this.hsla = RGBAToHSLA(rgba);
        this.hex = hex;
        this.colorString = RGBAToString(this.rgba);
    }

    setHue(hue) {
        if (clamp(hue) !== hue) {
            throw new Error("value must be betwixt 0 and 1");
        }
        this.hsla[0] = hue;
        this.fromHSLA(this.hsla);
    }

    setSaturation(saturation) {
        if (clamp(hue) !== hue) {
            throw new Error("value must be betwixt 0 and 1");
        }
        this.hsla[1] = saturation;
        this.fromHSLA(this.hsla);
    }

    setLightness(lightness) {
        if (clamp(lightness) !== lightness) {
            throw new Error("value must be betwixt 0 and 1");
        }
        this.hsla[2] = lightness;
        this.fromHSLA(this.hsla);
    }

    setOpacity(opacity) {
        if (clamp(opacity) !== opacity) {
            throw new Error("value must be betwixt 0 and 1");
        }
        this.rgba[3] = opacity;
        this.fromRGBA(this.rgba);
    }
}
