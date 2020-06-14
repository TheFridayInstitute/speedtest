import { clamp } from "./math.js";
import { debounce } from "./animation.js";

if (!String.prototype.splice) {
    String.prototype.splice = function (start, delCount, newSubStr) {
        return (
            this.slice(0, start) +
            newSubStr +
            this.slice(start + Math.abs(delCount))
        );
    };
}

export function setMeterNumbers(
    meterEl,
    numbersEl,
    radius,
    alpha0,
    alpha1,
    originX,
    originY,
    delay
) {
    let meterOffset = getOffset(meterEl);
    radius = radius === undefined ? meterOffset.width / 3 / 1.2 : radius;

    alpha0 = alpha0 === undefined ? Math.PI : alpha0;
    alpha1 = alpha1 === undefined ? 2 * Math.PI : alpha1;

    originX = originX === undefined ? meterOffset.width / 2 : originX;
    originY =
        originY === undefined ? meterOffset.height / 2 + radius / 2 : originY;

    delay = delay === undefined ? 100 : delay;

    let theta = alpha0;
    let d_theta = (alpha1 - alpha0) / (numbersEl.children.length - 1);

    Array.from(numbersEl.children).forEach((child, n) => {
        let childOffset = getOffset(child);

        let t_x = radius * Math.cos(theta);
        let t_y = radius * Math.sin(theta);

        t_x += originX - childOffset.width / 2;
        t_y += originY - childOffset.height / 2;

        child.style.transitionDelay = `${delay * n}ms`;
        child.style.transform = `translate(${t_x}px, ${t_y}px)`;

        theta += d_theta;
    });
}

export function toggle(el, firstCallback, secondCallback) {
    let toggled = el.getAttribute("toggled") === "true";
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
    return function () {
        if (func) {
            console.log(arguments);
            result = func.apply(this, arguments)
            func = null;
        }
        return result;
    };
}

export function slideToggle(el) {
    let slideHeight;
    if (!el.getAttribute("slide-height")) {
        el.style.height = "100%";
        slideHeight = getOffset(el).height;
        el.setAttribute("slide-height", slideHeight);
        el.style.height = `${slideHeight}px`;

        return;
    } else {
        slideHeight = el.getAttribute("slide-height");
    }

    if (el.style.height === "0px") {
        requestAnimationFrame(() => {
            el.style.height = `${slideHeight}px`;
        });
        el.style.overflow = "visible";
    } else {
        requestAnimationFrame(() => {
            el.style.height = 0;
            el.style.overflow = "hidden";
        });
    }
}

export function wrap(toWrap, wrapper) {
    let wrapped = toWrap.parentNode.insertBefore(wrapper, toWrap);
    return wrapped.appendChild(toWrap);
}

export function affixer(preAffixFunc, postAffixFunc) {
    const offsets = [];

    document.querySelectorAll(".affix").forEach((el, n) => {
        let offset = getOffset(el);
        offsets.push(offset);
        let wrapped = document.createElement("div");

        wrapped.style.height = `${offset.height}px`;
        wrapped.style.width = `${offset.width}px`;
        // wrapped.style.marginTop = `${offset.top}px`;

        wrap(el, wrapped);
    });

    window.addEventListener("resize", function (e) {
        scrollAffix();
    });

    window.addEventListener("scroll", scrollAffix);
    function scrollAffix() {
        document.querySelectorAll(".affix").forEach((el, n) => {
            let affixY = offsets[n].top;

            if (self.pageYOffset > affixY) {
                preAffixFunc(el, n);
                el.style.zIndex = 999;
                el.style.position = "fixed";
                el.style.top = `${0}px`;
                el.style.width = `${window.innerWidth - 2 * offsets[n].left}px`;
            } else {
                postAffixFunc(el, n);
                el.style.top = `${0}px`;
                el.style.position = "relative";
                el.style.width = `${window.innerWidth - 2 * offsets[n].left}px`;
            }
        });
    }
}

export function getOffset(el) {
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

export function emToPixels(em) {
    em = em.toLowerCase();
    let emNumber = 1;

    if (em.indexOf("px") !== -1) {
        emNumber = parseFloat(em.split("px")[0]);
        return emNumber;
    } else if (em.indexOf("em") !== -1) {
        emNumber = parseFloat(em.split("em")[0]);
    }

    let fontSize = parseFloat(
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

export function setAttributes(el, attrs) {
    for (var [key, value] of Object.entries(attrs)) {
        if (
            (key === "styles" || key === "style") &&
            typeof value === "object"
        ) {
            for (var prop in value) {
                el.style.setProperty(prop, value[prop]);
            }
        } else if (key === "html") {
            el.innerHTML = value;
        } else {
            el.setAttribute(key, value);
        }
    }
}

const objectMap = (obj, fn) =>
    Object.fromEntries(
        Object.entries(obj).map(([k, v], i) => [k, fn(v, k, i)])
    );

export function fluidText(
    el,
    constrainEl = undefined,
    maximize = false,
    attributes = undefined
) {
    constrainEl = !constrainEl ? el.parentElement : constrainEl;
    attributes = !attributes ? ["font-size"] : attributes;
    let offsetOriginal = getOffset(constrainEl);
    let attributesObj = {};

    attributes.map(function (value, index) {
        attributesObj[value] = emToPixels(getComputedVariable(value, el));
    });

    let _resize = function () {
        let offset = getOffset(constrainEl);
        let maxSize = Math.ceil(Math.min(offset.width, offset.height));

        let ratio =
            Math.min(offset.height, offset.width) /
            Math.min(offsetOriginal.height, offsetOriginal.width);

        let mappedAttributes = objectMap(attributesObj, function (attr) {
            let size = maximize ? maxSize : clamp(attr * ratio, 0, maxSize);
            return `${size}px`;
        });

        setAttributes(el, { styles: mappedAttributes });
    };

    let resize = debounce(_resize, 10);

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
}
