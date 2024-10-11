import { sleep } from "@utils/animation";
import { Color } from "@utils/colors.js";
import { lerp } from "@utils/math";

function once(func: (...args: any) => any) {
    let result: any;
    return function (...args: any) {
        if (func) {
            result = func.apply(this, ...args);
            func = null;
        }
        return result;
    };
}

function getOffset(el: Element) {
    const rect = el.getBoundingClientRect();

    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        leftX: rect.left,
        topY: rect.top,
    };
}

function emToPixels(em: string): number {
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

function getComputedVariable(v: string, el = document.documentElement) {
    return window.getComputedStyle(el).getPropertyValue(v);
}

export async function getIP() {
    // make a fetch call to get the IP address
    const response = await fetch("https://ip.friday.institute");
    return (await response.text()).trim();
}

export async function lookupIP(ip?: string) {
    ip = ip ?? (await getIP());
    // make a fetch call to get the IP address
    const response = await fetch(`https://ip.friday.institute/lookup/${ip}`);
    const data = await response.json();
    // return the IP address
    return data;
}

export async function getIPInfo(ip?: string) {
    console.log("getIPInfo", ip);

    ip = ip ?? (await getIP());
    // make a fetch call to get the IP address
    const response = await fetch(`https://ip.friday.institute/ipinfo/${ip}`);
    const data = await response.json();
    // return the IP address
    return data;
}

export const awaitHidden = async function () {
    while (document.hidden) {
        await sleep(10);
    }
};

export const generateColorStops = function (
    colorName: string,
    step = 0.5,
): Array<[number, string]> {
    const stops = Math.floor(1 / step) + 1;

    return Array(stops)
        .fill(0)
        .map(function (_, index) {
            const stop = index * step;
            const tmpColorName = `--${colorName}-${index}`;
            const color: string = getComputedVariable(tmpColorName);

            return [stop, color];
        });
};

export const generateInnerColorStops = function (
    value: [number, string],
): [number, string] {
    const [stop, color] = value;
    const newColor = new Color(color);
    newColor.opacity = 0.3;
    return [stop, newColor.colorString];
};

export { getOffset, getComputedVariable, once, emToPixels };
