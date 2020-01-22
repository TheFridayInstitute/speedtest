import {clamp, lerp, round, normalize, bounceInEase} from "./math.js";

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

export function debounce(func, wait, immediate) {
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

    let transformFunc = function(v) {
        el.style.transform = `translateX(${v}px)`;
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function slideLeft(el, to, from, duration) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let transformFunc = function(v) {
        el.style.transform = `translateX(${v}px)`;
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function fadeOut(el, duration) {
    duration = duration === undefined ? 1000 : duration;
    let to = 1;
    let from = 0;

    let transformFunc = function(v) {
        el.style.opacity = to - v;
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

export function rotateElement(el, to, from, duration, rad = false) {
    to = to === undefined ? window.innerWidth : to;
    from = from === undefined ? 0 : from;
    duration = duration === undefined ? 1000 : duration;

    let suffix = rad ? "rad" : "deg";

    let transformFunc = function(v, t) {
        el.style.transform = `rotate(${v}${suffix})`;
        el.setAttribute("rotation", v);
    };
    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}
