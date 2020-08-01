import { clamp, bounceInEase, easeInOutCubic, smoothStep3, translate } from "./math.js";

import { getOffset } from "./utils.js";

import { setAttributes } from "./utils.js";

export class Clock {
    constructor(autoStart = true, timeStep = 1000 / 60, timeOut = 120) {
        this.autoStart = autoStart;
        this.timeStep = Math.floor(timeStep);
        this.timeOut = timeOut;
    }
    start() {
        this.startTime = Date.now();
        this.prevTime = this.startTime;
        this.elapsedTime = 0;
        this.elapsedTicks = 0;
        this.running = true;
        this.delta = 0;
    }
    stop() {
        this.running = false;
    }
    reset() {
        this.start();
    }
    tick() {
        this.delta = 0;
        if (this.autoStart && !this.running) {
            this.start();
        } else if (this.running) {
            const currentTime = Date.now();

            this.delta = currentTime - this.prevTime;
            this.prevTime = currentTime;
            this.elapsedTime += this.delta;
            this.elapsedTicks += this.timeStep;
        }
        return this.delta;
    }
}

export async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce(func, wait, immediate = true) {
    var timeout;

    return function () {
        var context = this;
        var args = arguments;
        var later = function () {
            timeout = null;
            if (immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

export function throttle(func, wait = 1000) {
    let enableCall = true;

    return function (...args) {
        if (!enableCall) return;

        console.log("calling...");

        enableCall = false;
        func(...args);
        setTimeout(() => (enableCall = true), wait);
    };
}

export async function smoothAnimate(to, from, duration, transformFunc, timingFunc) {
    const distance = to - from;
    const clock = new Clock();
    let handle = null;

    function draw() {
        const c = clamp(clock.elapsedTicks, 0, duration);
        const v = timingFunc(c, from, distance, duration);
        const t = timingFunc(c, 0, 1, duration);

        return transformFunc(v, t) ?? false;
    }

    function animationLoop() {
        clock.tick();

        let delta = clock.delta;
        let updateSteps = 0;
        let force = false;

        while (delta >= clock.timeStep) {
            delta -= clock.timeStep;
            clock.tick();

            if (updateSteps++ >= clock.timeOut || force) {
                break;
            }
        }

        force = draw();

        if (force || clock.elapsedTicks / duration >= 1) {
            return true;
        } else {
            handle = requestAnimationFrame(animationLoop);
            return false;
        }
    }
    clock.start();
    handle = requestAnimationFrame(animationLoop);
    await sleep(duration);

    return handle;
}

export function animationLoopOuter(
    updateFunc,
    drawFunc,
    timeStep = 1000 / 60,
    timeOut = 120
) {
    const clock = new Clock(true, timeStep, timeOut);
    let handle = null;
    let force = false;
    let intervalId = null;

    function update() {
        return updateFunc(clock.elapsedTicks) ?? false;
    }

    function draw() {
        return drawFunc(clock.elapsedTicks) ?? false;
    }

    function animationLoop() {
        clock.tick();

        let delta = clock.delta;
        let updateSteps = 0;

        while (delta >= clock.timeStep) {
            delta -= clock.timeStep;
            clock.tick();

            if (updateSteps++ >= clock.timeOut || force) {
                break;
            }
        }

        force |= draw();

        if (force) {
            return true;
        } else {
            handle = requestAnimationFrame(animationLoop);
            return false;
        }
    }

    intervalId = setInterval(() => {
        force |= update();

        if (force) {
            clearInterval(intervalId);
            cancelAnimationFrame(handle);
        }
    }, clock.timeStep);

    clock.start();
    handle = requestAnimationFrame(animationLoop);

    return handle;
}

export async function blockCSSTimingTransition(el, func) {
    const elArray = !(el instanceof Array) ? [el] : el;

    const transitions = elArray.map(function (el) {
        const trans = el.style.transition;
        el.style.transition = "none";
        return trans;
    });

    await func();

    elArray.forEach(function (el, index) {
        el.style.transition = transitions[index];
    });
}

export async function animateElements(
    el,
    to,
    from,
    duration,
    transformFunc,
    timingFunc = easeInOutCubic
) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    const elArray = !(el instanceof Array) ? [el] : el;

    const wrap = function (v) {
        for (const el of elArray) {
            transformFunc(el, v);
        }
    };

    const animate = async function () {
        await smoothAnimate(to, from, duration, wrap, timingFunc);
    };

    await blockCSSTimingTransition(elArray, animate);
}

export async function slideRight(el, to, from, duration) {
    const transformFunc = function (el, v) {
        el.style.transform = `translateX(${v}px)`;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

export async function slideLeft(el, to, from, duration) {
    const transformFunc = function (el, v) {
        el.style.transform = `translateX(${v}px)`;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

export async function fadeOut(el, duration) {
    duration = duration === undefined ? 1000 : duration;
    const to = 1;
    const from = 0;

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    const transformFunc = function (v) {
        for (const el of elArray) {
            el.style.opacity = to - v;
        }
    };

    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export async function smoothRotate(el, to, from, duration, rad = false) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    const suffix = rad ? "rad" : "deg";

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    const transformFunc = function (v) {
        for (const el of elArray) {
            el.style.transform = `rotate(${v}${suffix})`;
            el.setAttribute("rotation", v);
        }
    };
    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function createProgressBar(el, colors, leftAttrs, rightAttrs) {
    let i = 0;
    for (const color of colors) {
        const shape = document.createElement("div");

        if (i === 0) {
            setAttributes(shape, leftAttrs);
        }
        if (i === colors.length - 1) {
            setAttributes(shape, rightAttrs);
        }

        shape.classList.add("progress-bar");
        if (String(color).indexOf("gradient") !== -1) {
            shape.style.backgroundImage = color;
        } else {
            shape.style.backgroundColor = color;
        }
        el.appendChild(shape);
        i++;
    }
}

export async function animateProgressBar(el, to, from, duration, stops) {
    to = to === undefined ? 1 : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;
    stops = stops === undefined ? el.children.length : stops;

    const elStep = Math.floor(stops / el.children.length);

    const setProgressBar = function (el, t) {
        const step = 1 / stops;
        let s = t;

        for (const child of el.children) {
            let v = 0;
            for (let i = 0; i < elStep; i++) {
                if (s > 0) {
                    if (s - step > 0) {
                        v += step;
                    } else {
                        v += s;
                    }
                    s -= step;
                } else {
                    break;
                }
            }
            child.style.width = `${100 * v}%`;
        }
    };

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    for (const el of elArray) {
        el.setAttribute("percent-complete", to);
    }

    const transformFunc = function (v) {
        for (const el of elArray) {
            setProgressBar(el, v);
        }
    };

    await smoothAnimate(to, from, duration, transformFunc, easeInOutCubic);
}

export async function animateProgressBarWrapper(el, duration, stops) {
    duration = duration === undefined ? 1000 : duration;
    stops = stops === undefined ? el.children.length : stops;

    const step = 1 / stops;

    const from = parseFloat(el.getAttribute("percent-complete")) || 0;
    const to = clamp(from + step, 0, 1);

    await animateProgressBar(el, to, from, duration, stops);
}

export async function rippleButton(ev, buttonEl, rippleEl, to, from, duration) {
    const buttonOffset = getOffset(buttonEl);

    const centerX = buttonOffset.left + buttonOffset.width / 2;
    const centerY = buttonOffset.top + buttonOffset.height / 2;

    const [x, y] = translate([ev.pageX, ev.pageY], -centerX, -centerY);

    rippleEl.style.transform = `translate(${x}px, ${y}px)`;
    rippleEl.style.width = 0;
    rippleEl.style.height = 0;

    const transformFunc = function (v, t) {
        const r = `${v}rem`;
        rippleEl.style.width = r;
        rippleEl.style.height = r;
        rippleEl.style.opacity = 1 - t;
    };
    await smoothAnimate(to, from, duration, transformFunc, smoothStep3);
}

export async function slideRightWrap(el, to, from, duration, func) {
    const width = window.innerWidth;
    const time = duration / 3;

    await slideRight(el, width, 0, time);

    el.classList.add("hidden");
    func();

    await slideLeft(el, -width, width, time);

    el.classList.remove("hidden");

    await slideRight(el, to, from - width, time);
}

export async function smoothScroll(to, from, duration) {
    const transformFunc = function (v) {
        window.scroll(0, v);
    };
    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}
