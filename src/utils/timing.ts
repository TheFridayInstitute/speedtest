/**
 * Timing utilities — sleep, throttle, and animation helpers.
 */

/** Promise-based delay for async flows. */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Throttle a function to execute at most once per `wait` ms.
 * Subsequent calls within the wait period are silently dropped.
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number,
): T {
    let lastTime = 0;

    return function (this: any, ...args: any[]) {
        const now = Date.now();
        if (now - lastTime >= wait) {
            lastTime = now;
            return func.apply(this, args);
        }
    } as T;
}

/**
 * Smoothly animate a value from `from` to `to` over `duration` ms.
 * Calls `transformFunc(currentValue, normalizedTime)` on each frame.
 * Uses `timingFunc` for easing (receives raw progress 0→1).
 *
 * Returns a Promise that resolves when the animation completes.
 */
export function smoothAnimate(
    to: number,
    from: number,
    duration: number,
    transformFunc: (value: number, t: number) => boolean | void,
    timingFunc: (t: number, a: number, b: number, c: number) => number,
): Promise<void> {
    return new Promise((resolve) => {
        const startTime = performance.now();
        const distance = to - from;

        function frame(now: number) {
            const elapsed = now - startTime;
            const rawT = Math.min(elapsed / duration, 1);
            const t = timingFunc(rawT, from, distance, 1);
            const value = from + distance * rawT;

            const stop = transformFunc(value, t);

            if (rawT < 1 && stop !== true) {
                requestAnimationFrame(frame);
            } else {
                resolve();
            }
        }

        requestAnimationFrame(frame);
    });
}

/**
 * Create a 60fps render loop with separate update and draw callbacks.
 * Returns start/stop controls and a dispose function for cleanup.
 */
export function createRenderLoop(options: {
    onUpdate: (elapsed: number) => boolean | void;
    onDraw: (elapsed: number) => boolean | void;
    fps?: number;
}): { start: () => void; stop: () => void; dispose: () => void } {
    const { onUpdate, onDraw, fps = 60 } = options;
    const interval = 1000 / fps;

    let animFrameId: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let running = false;

    function start() {
        if (running) return;
        running = true;

        intervalId = setInterval(() => {
            onUpdate(performance.now());
        }, interval);

        function drawLoop() {
            if (!running) return;
            onDraw(performance.now());
            animFrameId = requestAnimationFrame(drawLoop);
        }
        animFrameId = requestAnimationFrame(drawLoop);
    }

    function stop() {
        running = false;
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (animFrameId !== null) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    function dispose() {
        stop();
    }

    return { start, stop, dispose };
}

/**
 * Create a DOM progress bar with colored fill segments.
 *
 * @param element — container element for the progress bar
 * @param colors — array of CSS gradient/color strings for the fill
 * @param leftAttrs — style overrides for left edge (e.g., border-radius)
 * @param rightAttrs — style overrides for right edge
 */
export function createProgressBar(
    element: HTMLElement,
    colors: string[],
    leftAttrs?: { styles?: Record<string, string> },
    rightAttrs?: { styles?: Record<string, string> },
): void {
    for (let i = 0; i < colors.length; i++) {
        const bar = document.createElement("div");
        bar.classList.add("progress-bar");
        bar.style.background = colors[i];

        if (i === 0 && leftAttrs?.styles) {
            for (const [k, v] of Object.entries(leftAttrs.styles)) {
                bar.style.setProperty(k, v);
            }
        }
        if (i === colors.length - 1 && rightAttrs?.styles) {
            for (const [k, v] of Object.entries(rightAttrs.styles)) {
                bar.style.setProperty(k, v);
            }
        }

        element.appendChild(bar);
    }
}

/**
 * Animate the fill width of a DOM progress bar element.
 */
export function animateProgressBar(
    el: HTMLElement,
    to: number,
    from: number,
    duration: number,
): void {
    const startTime = performance.now();
    const distance = to - from;

    function frame(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const current = from + distance * t;

        el.style.width = `${current}%`;
        el.setAttribute("percent-complete", String(current));

        if (t < 1) {
            requestAnimationFrame(frame);
        }
    }
    requestAnimationFrame(frame);
}

/**
 * Wrapper that advances the progress bar by one segment.
 */
export function animateProgressBarWrapper(
    progressBarContainer: HTMLElement,
    duration: number,
    n: number,
): void {
    const bars = progressBarContainer.querySelectorAll<HTMLElement>(".progress-bar");
    if (!bars.length) return;

    const bar = bars[0];
    const currentPercent =
        parseFloat(bar.getAttribute("percent-complete") || "0") || 0;
    const step = 100 / n;
    const nextPercent = Math.min(currentPercent + step, 100);

    animateProgressBar(bar, nextPercent, currentPercent, duration);
}

/**
 * Material-design style ripple effect on a button.
 *
 * @param ev — the mouse event that triggered the ripple
 * @param button — the button element
 * @param rippleEl — the ripple overlay element
 * @param maxRadius — max ripple radius in rem
 * @param minRadius — min ripple radius in rem
 * @param duration — ripple animation duration in ms
 */
export function rippleButton(
    ev: MouseEvent,
    button: HTMLElement,
    rippleEl: HTMLElement,
    maxRadius: number,
    minRadius: number,
    duration: number,
): void {
    const rect = button.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;

    rippleEl.style.left = `${x}px`;
    rippleEl.style.top = `${y}px`;
    rippleEl.style.setProperty("--ripple-size", `${maxRadius * 2}rem`);
    rippleEl.style.animation = `ripple-expand ${duration}ms ease-out forwards`;

    setTimeout(() => {
        rippleEl.style.animation = "";
    }, duration);
}
