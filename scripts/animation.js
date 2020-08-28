var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { clamp, bounceInEase, easeInOutCubic, smoothStep3, translate } from "./math.js";
import { getOffset } from "./utils.js";
import { $ } from "./dollar.js";
class Clock {
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
        }
        else if (this.running) {
            const currentTime = Date.now();
            this.delta = currentTime - this.prevTime;
            this.prevTime = currentTime;
            this.elapsedTime += this.delta;
            this.elapsedTicks += this.timeStep;
        }
        return this.delta;
    }
}
function sleep(ms) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => setTimeout(resolve, ms));
    });
}
function throttle(func, wait = 1000) {
    let enableCall = true;
    return function (...args) {
        if (!enableCall)
            return;
        console.log("calling...");
        enableCall = false;
        func(...args);
        setTimeout(() => (enableCall = true), wait);
    };
}
function smoothAnimate(to, from, duration, transformFunc, timingFunc) {
    return __awaiter(this, void 0, void 0, function* () {
        const distance = to - from;
        const clock = new Clock();
        let handle = null;
        function draw() {
            var _a;
            const c = clamp(clock.elapsedTicks, 0, duration);
            const v = timingFunc(c, from, distance, duration);
            const t = timingFunc(c, 0, 1, duration);
            return (_a = transformFunc(v, t)) !== null && _a !== void 0 ? _a : false;
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
            }
            else {
                handle = requestAnimationFrame(animationLoop);
                return false;
            }
        }
        clock.start();
        handle = requestAnimationFrame(animationLoop);
        yield sleep(duration);
        return handle;
    });
}
function animationLoopOuter(updateFunc, drawFunc, timeStep = 1000 / 60, timeOut = 120) {
    const clock = new Clock(true, timeStep, timeOut);
    let handle = null;
    let force = false;
    let intervalId = null;
    function update() {
        var _a;
        return (_a = updateFunc(clock.elapsedTicks)) !== null && _a !== void 0 ? _a : false;
    }
    function draw() {
        var _a;
        return (_a = drawFunc(clock.elapsedTicks)) !== null && _a !== void 0 ? _a : false;
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
        }
        else {
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
function blockCSSTimingTransition(el, func) {
    return __awaiter(this, void 0, void 0, function* () {
        const elArray = !(el instanceof Array) ? [el] : el;
        const transitions = elArray.map(function (el) {
            const trans = el.style.transition;
            el.style.transition = "none";
            return trans;
        });
        yield func();
        elArray.forEach(function (el, index) {
            el.style.transition = transitions[index];
        });
    });
}
function animateElements(el, to, from, duration, transformFunc, timingFunc = easeInOutCubic) {
    return __awaiter(this, void 0, void 0, function* () {
        // TODO: use ?? here.
        to = to === undefined ? window.innerWidth : to;
        from = from === undefined ? 0 : from;
        duration = duration === undefined ? 1000 : duration;
        const elArray = !(el instanceof Array) ? [el] : el;
        const wrap = function (v) {
            for (const el of elArray) {
                transformFunc(el, v);
            }
            return false;
        };
        const animate = function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield smoothAnimate(to, from, duration, wrap, timingFunc);
            });
        };
        yield blockCSSTimingTransition(elArray, animate);
    });
}
function slideRight(el, to, from, duration) {
    return __awaiter(this, void 0, void 0, function* () {
        const transformFunc = function (el, v) {
            el.style.transform = `translateX(${v}px)`;
            return false;
        };
        yield animateElements(el, to, from, duration, transformFunc);
    });
}
function slideLeft(el, to, from, duration) {
    return __awaiter(this, void 0, void 0, function* () {
        const transformFunc = function (el, v) {
            el.style.transform = `translateX(${v}px)`;
            return false;
        };
        yield animateElements(el, to, from, duration, transformFunc);
    });
}
function fadeOut(el, duration) {
    return __awaiter(this, void 0, void 0, function* () {
        const to = 1;
        const from = 0;
        const transformFunc = function (el, v) {
            el.style.opacity = String(to - v);
            return false;
        };
        yield animateElements(el, to, from, duration, transformFunc);
    });
}
function smoothRotate(el, to, from, duration, rad = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const suffix = rad ? "rad" : "deg";
        const transformFunc = function (el, v) {
            el.style.transform = `rotate(${v}${suffix})`;
            el.setAttribute("rotation", String(v));
            return false;
        };
        yield animateElements(el, to, from, duration, transformFunc);
    });
}
function createProgressBar(el, colors, leftAttrs, rightAttrs) {
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
        }
        else {
            shape.style.backgroundColor = color;
        }
        el.appendChild(shape);
        i++;
    }
}
function animateProgressBar(el, to, from, duration, stops) {
    return __awaiter(this, void 0, void 0, function* () {
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
                        }
                        else {
                            v += s;
                        }
                        s -= step;
                    }
                    else {
                        break;
                    }
                }
                child.style.width = `${100 * v}%`;
            }
        };
        let elArray;
        if (!(el instanceof Array)) {
            elArray = [el];
        }
        else {
            elArray = el;
        }
        for (const el of elArray) {
            el.setAttribute("percent-complete", to);
        }
        const transformFunc = function (v) {
            for (const el of elArray) {
                setProgressBar(el, v);
            }
            return false;
        };
        yield smoothAnimate(to, from, duration, transformFunc, easeInOutCubic);
    });
}
function animateProgressBarWrapper(el, duration, stops) {
    return __awaiter(this, void 0, void 0, function* () {
        duration = duration === undefined ? 1000 : duration;
        stops = stops === undefined ? el.children.length : stops;
        const step = 1 / stops;
        const from = parseFloat(el.getAttribute("percent-complete")) || 0;
        const to = clamp(from + step, 0, 1);
        yield animateProgressBar(el, to, from, duration, stops);
    });
}
function rippleButton(ev, buttonEl, rippleEl, to, from, duration) {
    return __awaiter(this, void 0, void 0, function* () {
        const buttonOffset = getOffset(buttonEl);
        const centerX = buttonOffset.left + buttonOffset.width / 2;
        const centerY = buttonOffset.top + buttonOffset.height / 2;
        const [x, y] = translate([ev.pageX, ev.pageY], -centerX, -centerY);
        rippleEl.style.transform = `translate(${x}px, ${y}px)`;
        rippleEl.style.width = "0";
        rippleEl.style.height = "0";
        const transformFunc = function (v, t) {
            const r = `${v}rem`;
            rippleEl.style.width = r;
            rippleEl.style.height = r;
            rippleEl.style.opacity = String(1 - t);
            return false;
        };
        yield smoothAnimate(to, from, duration, transformFunc, smoothStep3);
    });
}
function slideRightWrap(el, to, from, duration, func) {
    return __awaiter(this, void 0, void 0, function* () {
        const width = window.innerWidth;
        const time = duration / 3;
        yield slideRight(el, width, 0, time);
        el.classList.add("hidden");
        func();
        yield slideLeft(el, -width, width, time);
        el.classList.remove("hidden");
        yield slideRight(el, to, from - width, time);
    });
}
function smoothScroll(to, from, duration) {
    return __awaiter(this, void 0, void 0, function* () {
        const transformFunc = function (v) {
            window.scroll(0, v);
            return false;
        };
        yield smoothAnimate(to, from, duration, transformFunc, bounceInEase);
    });
}
export { sleep, throttle, smoothAnimate, animateElements, animateProgressBarWrapper, animationLoopOuter, smoothScroll, smoothRotate, slideLeft, slideRight, slideRightWrap, fadeOut, rippleButton, createProgressBar, animateProgressBar };
//# sourceMappingURL=animation.js.map