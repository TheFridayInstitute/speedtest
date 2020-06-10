import { clamp } from "./math.js";

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

export function toggleOnce(el, firstCallback, force = false) {
    let toggled = el.getAttribute("toggled") === "true";
    if (!toggled || force) {
        firstCallback(el);
        if (force) {
            el.setAttribute("toggled", !toggled);
        } else {
            el.setAttribute("toggled", true);
        }
    }
    return;
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
                el.style[prop] = value[prop];
            }
        } else if (key === "html") {
            el.innerHTML = value;
        } else {
            el.setAttribute(key, value);
        }
    }
}

export function fluidText(el, constrainEl = undefined) {
    let offsetOriginal = getOffset(el);
    constrainEl = constrainEl === undefined ? el.parentElement : constrainEl;

    let f = parseFloat(getComputedVariable("font-size", el).split("px")[0]);

    let resize = function () {
        let constrainOffset = getOffset(constrainEl);
        let offset = getOffset(el);

        let maxSize = Math.ceil(
            Math.min(constrainOffset.width, constrainOffset.height)
        );

        let ratio =
            (offset.top + offset.left) /
            2 /
            ((offsetOriginal.top + offsetOriginal.left) / 2);

        console.log(ratio, f, maxSize);

        let size = clamp(f * ratio, 0, maxSize);

        el.style.fontSize = `${size}px`;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
}
