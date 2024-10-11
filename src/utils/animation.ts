import { clamp, bounceInEase, easeInOutCubic, smoothStep3, translate } from "./math.js";

import { getOffset } from "./utils.js";

import { $ } from "./dollar.js";

class Clock {
    autoStart: boolean;
    timeStep: number;
    timeOut: number;
    startTime: number;
    prevTime: number;
    elapsedTime: number;
    elapsedTicks: number;
    running: boolean;
    delta: number;

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

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function throttle(func: (...args: any) => void, wait = 1000) {
    let enableCall = true;

    return function (...args: any) {
        if (!enableCall) return;

        console.log("calling...");

        enableCall = false;
        func(...args);
        setTimeout(() => (enableCall = true), wait);
    };
}

async function smoothAnimate(
    to: number,
    from: number,
    duration: number,
    transformFunc: (v: number, t?: number) => undefined | boolean,
    timingFunc: (t: number, from: number, distance: number, duration: number) => number
) {
    const distance = to - from;
    const clock = new Clock();
    let handle: number = null;

    function draw(): boolean {
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

function animationLoopOuter(
    updateFunc: (t: number) => undefined | boolean,
    drawFunc: (t: number) => undefined | boolean,
    timeStep = 1000 / 60,
    timeOut = 120
) {
    const clock = new Clock(true, timeStep, timeOut);
    let handle: number = null;
    let force = false;
    let intervalId = null;

    function update(): boolean {
        return updateFunc(clock.elapsedTicks) ?? false;
    }

    function draw(): boolean {
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

        force = force || draw();

        if (force) {
            return true;
        } else {
            handle = requestAnimationFrame(animationLoop);
            return false;
        }
    }

    intervalId = setInterval(() => {
        force = force || update();

        if (force) {
            clearInterval(intervalId);
            cancelAnimationFrame(handle);
        }
    }, clock.timeStep);

    clock.start();
    handle = requestAnimationFrame(animationLoop);

    return handle;
}

async function blockCSSTimingTransition(
    el: HTMLElement | Array<HTMLElement>,
    func: (...args: any) => any
) {
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

async function animateElements(
    el: HTMLElement | Array<HTMLElement>,
    to?: number,
    from?: number,
    duration?: number,
    transformFunc?: (el: HTMLElement, v: number) => undefined | boolean,
    timingFunc = easeInOutCubic
) {
    // TODO: use ?? here.
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    const elArray = !(el instanceof Array) ? [el] : el;

    const wrap = function (v: number) {
        for (const el of elArray) {
            transformFunc(el, v);
        }
        return false;
    };

    const animate = async function () {
        await smoothAnimate(to, from, duration, wrap, timingFunc);
    };

    await blockCSSTimingTransition(elArray, animate);
}

async function slideRight(
    el: HTMLElement | Array<HTMLElement>,
    to?: number,
    from?: number,
    duration?: number
) {
    const transformFunc = function (el: HTMLElement, v: number) {
        el.style.transform = `translateX(${v}px)`;
        return false;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

async function slideLeft(
    el: HTMLElement | Array<HTMLElement>,
    to?: number,
    from?: number,
    duration?: number
) {
    const transformFunc = function (el: HTMLElement, v: number) {
        el.style.transform = `translateX(${v}px)`;
        return false;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

async function fadeOut(el: HTMLElement | Array<HTMLElement>, duration?: number) {
    const to = 1;
    const from = 0;

    const transformFunc = function (el: HTMLElement, v: number) {
        el.style.opacity = String(to - v);
        return false;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

async function smoothRotate(
    el: HTMLElement | Array<HTMLElement>,
    to: number,
    from: number,
    duration: number,
    rad = false
) {
    const suffix = rad ? "rad" : "deg";

    const transformFunc = function (el: HTMLElement, v: number) {
        el.style.transform = `rotate(${v}${suffix})`;
        el.setAttribute("rotation", String(v));
        return false;
    };
    await animateElements(el, to, from, duration, transformFunc);
}

function createProgressBar(
    el: HTMLElement,
    colors: string | any[],
    leftAttrs: any,
    rightAttrs: any
) {
    let i = 0;
    for (const color of colors) {
        const shape = $(document.createElement("div"));

        if (i === 0) {
            shape.setattr(leftAttrs);
        }
        if (i === colors.length - 1) {
            shape.setattr(rightAttrs);
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

async function animateProgressBar(
    el: HTMLElement,
    to: number,
    from: number,
    duration: any,
    stops?: number
) {
    to = to === undefined ? 1 : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;
    stops = stops === undefined ? el.children.length : stops;

    const elStep = Math.floor(stops / el.children.length);

    const setProgressBar = function (el: { children: any }, t: any) {
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

    let elArray: any[];
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    for (const el of elArray) {
        el.setAttribute("percent-complete", to);
    }

    const transformFunc = function (v: any) {
        for (const el of elArray) {
            setProgressBar(el, v);
        }
        return false;
    };

    await smoothAnimate(to, from, duration, transformFunc, easeInOutCubic);
}

async function animateProgressBarWrapper(
    el: HTMLElement,
    duration: number,
    stops: number
) {
    duration = duration === undefined ? 1000 : duration;
    stops = stops === undefined ? el.children.length : stops;

    const step = 1 / stops;

    const from = parseFloat(el.getAttribute("percent-complete")) || 0;
    const to = clamp(from + step, 0, 1);

    await animateProgressBar(el, to, from, duration, stops);
}

async function rippleButton(
    ev: MouseEvent,
    buttonEl: HTMLElement,
    rippleEl: HTMLElement,
    to: number,
    from: number,
    duration: number
) {
    const buttonOffset = getOffset(buttonEl);

    const centerX = buttonOffset.left + buttonOffset.width / 2;
    const centerY = buttonOffset.top + buttonOffset.height / 2;

    const [x, y] = translate([ev.pageX, ev.pageY], -centerX, -centerY);

    rippleEl.style.transform = `translate(${x}px, ${y}px)`;
    rippleEl.style.width = "0";
    rippleEl.style.height = "0";

    const transformFunc = function (v: number, t: number) {
        const r = `${v}rem`;
        rippleEl.style.width = r;
        rippleEl.style.height = r;
        rippleEl.style.opacity = String(1 - t);

        return false;
    };
    await smoothAnimate(to, from, duration, transformFunc, smoothStep3);
}

async function slideRightWrap(
    el: HTMLElement,
    to: number,
    from: number,
    duration: number,
    func: (...args: any) => any
) {
    const width = window.innerWidth;
    const time = duration / 3;

    await slideRight(el, width, 0, time);

    el.classList.add("hidden");
    func();

    await slideLeft(el, -width, width, time);

    el.classList.remove("hidden");

    await slideRight(el, to, from - width, time);
}

async function smoothScroll(to: any, from: any, duration: any) {
    const transformFunc = function (v: number) {
        window.scroll(0, v);
        return false;
    };
    await smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export {
    sleep,
    throttle,
    smoothAnimate,
    animateElements,
    animateProgressBarWrapper,
    animationLoopOuter,
    smoothScroll,
    smoothRotate,
    slideLeft,
    slideRight,
    slideRightWrap,
    fadeOut,
    rippleButton,
    createProgressBar,
    animateProgressBar
};
