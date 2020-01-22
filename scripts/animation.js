import {
    clamp,
    lerp,
    round,
    normalize,
    bounceInEase,
    easeInOutCubic,
} from "./math.js";

import {setAttributes} from "./utils.js";

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

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function debounce(func, wait, immediate = false) {
    var timeout;
    return function() {
        var context = this;
        var args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

export function smoothAnimate(to, from, duration, transformFunc, timingFunc) {
    let distance = to - from;

    var clock = new Clock();

    function update() {}

    function draw() {
        let c = clamp(clock.elapsedTicks, 0, duration);
        let v = timingFunc(c, from, distance, duration);
        let t = normalize(v, from, to);

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
        if (force || clock.elapsedTicks / duration > 1) {
            return true;
        } else {
            requestAnimationFrame(animationLoop);
        }
    }
    clock.start();
    requestAnimationFrame(animationLoop);
}

export function animationLoopOuter(updateFunc, drawFunc, timeStep, timeOut) {
    let clock = new Clock(true, timeStep, timeOut);

    function update() {
        return updateFunc(clock.elapsedTicks);
    }

    function draw() {
        return drawFunc(clock.elapsedTicks);
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

export function slideRight(el, to, from, duration) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    let transformFunc = function(v) {
        for (let el of elArray) {
            el.style.transform = `translateX(${v}px)`;
        }
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function slideLeft(el, to, from, duration) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    let transformFunc = function(v) {
        for (let el of elArray) {
            el.style.transform = `translateX(${v}px)`;
        }
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function fadeOut(el, duration) {
    duration = duration === undefined ? 1000 : duration;
    let to = 1;
    let from = 0;

    let elArray;
    if (!(el instanceof Array)) {
        elArray = [el];
    } else {
        elArray = el;
    }

    let transformFunc = function(v) {
        for (let el of elArray) {
            el.style.opacity = to - v;
        }
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function rotateElement(el, to, from, duration, rad = false) {
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

    let transformFunc = function(v, t) {
        for (let el of elArray) {
            el.style.transform = `rotate(${v}${suffix})`;
            el.setAttribute("rotation", v);
        }
    };
    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function createProgessBar(el, colors, leftAttrs, rightAttrs) {
    let i = 0;
    for (let color of colors) {
        let shape = document.createElement("div");

        if (i === 0) {
            setAttributes(shape, leftAttrs);
        } else if (i === colors.length - 1) {
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

export function animateProgressBar(el, to, from, duration) {
    to = to === undefined ? 1 : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let setProgressBar = function(el, t) {
        let n = el.children.length || 1;
        let step = 1 / n;
        let s = t;
        let v = 0;

        for (let child of el.children) {
            if (s > 0) {
                if (s - step > 0) {
                    v = step;
                } else {
                    v = s;
                }
                child.style.width = `${round(100 * v, 2)}%`;
                s -= step;
            } else {
                break;
            }
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

    let transformFunc = function(v, t) {
        for (let el of elArray) {
            setProgressBar(el, v);
        }
    };

    smoothAnimate(to, from, duration, transformFunc, easeInOutCubic);
}

export function animateProgressBarWrapper(el, duration) {
    duration = duration === undefined ? 1000 : duration;

    let n = el.children.length || 1;
    let step = 1 / n;

    let from = parseFloat(el.getAttribute("percent-complete")) || 0;
    let to = clamp(from + step, 0, 1);

    animateProgressBar(el, to, from, duration);
}
