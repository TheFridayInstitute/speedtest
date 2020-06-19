import { clamp, bounceInEase, easeInOutCubic, smoothStep3 } from "./math.js";

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
            let currentTime = Date.now();

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

let clock = new Clock();
let started = false;
let delta = clock.tick();

export function throttle(func, wait) {
    var delta = null;

    return function () {
        var context = this;
        var args = arguments;
        delta = clock.tick();

        if (!started || delta >= wait) {
            func.apply(context, args);
        }
        started = !started ? true : started;
    };
}

export async function smoothAnimate(
    to,
    from,
    duration,
    transformFunc,
    timingFunc
) {
    let distance = to - from;

    let clock = new Clock();

    function update() {}

    function draw() {
        let c = clamp(clock.elapsedTicks, 0, duration);
        let v = timingFunc(c, from, distance, duration);
        let t = timingFunc(c, 0, 1, duration);

        let b = transformFunc(v, t) || false;
        return b;
    }

    function animationLoop() {
        clock.tick();

        let delta = clock.delta;
        let updateSteps = 0;
        let force = false;

        while (delta >= clock.timeStep) {
            delta -= clock.timeStep;
            clock.tick();

            update();
            if (updateSteps++ >= clock.timeOut || force) {
                break;
            }
        }

        force = draw();

        if (force || clock.elapsedTicks / duration >= 1) {
            return true;
        } else {
            requestAnimationFrame(animationLoop);
        }
    }
    clock.start();
    requestAnimationFrame(animationLoop);
    await sleep(duration);
}

export function animationLoopOuter(updateFunc, drawFunc, timeStep, timeOut) {
    let clock = new Clock(true, timeStep, timeOut);

    function update() {
        return updateFunc(clock.elapsedTicks) || false;
    }

    function draw() {
        return drawFunc(clock.elapsedTicks) || false;
    }

    function animationLoop() {
        clock.tick();

        let delta = clock.delta;
        let updateSteps = 0;
        let force = false;

        while (delta >= clock.timeStep) {
            delta -= clock.timeStep;
            clock.tick();

            force = update();

            if (updateSteps++ >= clock.timeOut || force) {
                break;
            }
        }

        force = draw();

        if (force) {
            return true;
        } else {
            requestAnimationFrame(animationLoop);
        }
    }

    clock.start();
    requestAnimationFrame(animationLoop);
}

export async function blockCSSTimingTransition(el, func) {
    let elArray = !(el instanceof Array) ? [el] : el;

    let transitions = elArray.map(function (el) {
        let trans = el.style.transition;
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
    timingFunc = smoothStep3
) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let elArray = !(el instanceof Array) ? [el] : el;

    let wrap = function (v) {
        for (let el of elArray) {
            transformFunc(el, v);
        }
    };

    let animate = async function () {
        await smoothAnimate(to, from, duration, wrap, timingFunc);
    };

    await blockCSSTimingTransition(elArray, animate);
}

export async function slideRight(el, to, from, duration) {
    let transformFunc = function (el, v) {
        el.style.transform = `translateX(${v}px)`;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

export async function slideLeft(el, to, from, duration) {
    let transformFunc = function (el, v) {
        el.style.transform = `translateX(${v}px)`;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

export async function fadeOut(el, duration) {
    duration = duration === undefined ? 1000 : duration;
    let to = 1;
    let from = 0;

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    let transformFunc = function (v) {
        for (let el of elArray) {
            el.style.opacity = to - v;
        }
    };

    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export async function smoothRotate(el, to, from, duration, rad = false) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let suffix = rad ? "rad" : "deg";

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    let transformFunc = function (v, t) {
        for (let el of elArray) {
            el.style.transform = `rotate(${v}${suffix})`;
            el.setAttribute("rotation", v);
        }
    };
    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function createProgressBar(el, colors, leftAttrs, rightAttrs) {
    let i = 0;
    for (let color of colors) {
        let shape = document.createElement("div");

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
    let elStep = Math.floor(stops / el.children.length);

    let setProgressBar = function (el, t) {
        let step = 1 / stops;
        let s = t;

        for (let child of el.children) {
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

    for (let el of elArray) {
        el.setAttribute("percent-complete", to);
    }

    let transformFunc = function (v, t) {
        for (let el of elArray) {
            setProgressBar(el, v);
        }
    };

    await smoothAnimate(to, from, duration, transformFunc, easeInOutCubic);
}

export async function animateProgressBarWrapper(el, duration, stops) {
    duration = duration === undefined ? 1000 : duration;
    stops = stops === undefined ? el.children.length : stops;

    let step = 1 / stops;

    let from = parseFloat(el.getAttribute("percent-complete")) || 0;
    let to = clamp(from + step, 0, 1);

    await animateProgressBar(el, to, from, duration, stops);
}

export async function rippleButton(ev, buttonEl, rippleEl, to, from, duration) {
    let buttonOffset = getOffset(buttonEl);
    let x = ev.clientX;
    let y = ev.clientY;
    console.log(x, y);

    x -= buttonOffset.left + buttonOffset.width / 2;
    y -= buttonOffset.top + buttonOffset.height / 2;

    rippleEl.style.transform = `translate(${x}px, ${y}px)`;
    // rippleEl.style.width = 0;
    // rippleEl.style.height = 0;

    let transformFunc = function (v, t) {
        let r = `${v}rem`;
        rippleEl.style.width = r;
        rippleEl.style.height = r;
        rippleEl.style.opacity = 1 - t;
    };
    await smoothAnimate(to, from, duration, transformFunc, smoothStep3);
}

export async function slideRightWrap(el, to, from, duration, func) {
    let width = window.innerWidth;
    let time = duration / 3;

    await slideRight(el, width, 0, time);

    el.classList.add("hidden");
    func();

    await slideLeft(el, -width, width, time);

    el.classList.remove("hidden");

    await slideRight(el, to, from - width, time);
}

export async function smoothScroll(to, from, duration) {
    let transformFunc = function (v) {
        window.scroll(0, v);
    };
    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}
