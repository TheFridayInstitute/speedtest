export function toggle(el, firstCallback, secondCallback) {
    const toggled = el.getAttribute("toggled") === "true";
    if (!toggled) {
        firstCallback(el);
    } else {
        secondCallback(el);
    }
    el.setAttribute("toggled", !toggled);
    return;
}

export function once(func) {
    let result;
    return function (...args) {
        if (func) {
            result = func.apply(this, ...args);
            func = null;
        }
        return result;
    };
}

export function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
        leftX: rect.left,
        topY: rect.top
    };
}

export function emToPixels(em) {
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
            .replace(/[a-z]/g, "")
    );

    return emNumber * fontSize;
}

export function getComputedVariable(v, el = document.documentElement) {
    return window.getComputedStyle(el).getPropertyValue(v);
}
