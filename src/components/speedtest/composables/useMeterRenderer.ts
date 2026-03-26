/**
 * useMeterRenderer — orchestrates canvas meter drawing.
 *
 * Uses @mkbabb/keyframes.js for all animation:
 * - SmoothProgress for exponentially-damped live value tracking
 * - NumericAnimation for completion spin and abort-reset tweens
 */

import { watch, type Ref } from "vue";
import { NumericAnimation, SmoothProgress, easeOutCubic } from "@mkbabb/keyframes.js";
import { lerp, clamp } from "@utils/math";
import { Canvas } from "../utils/canvas/core";
import { computeMeterConfig, type MeterConfig } from "../utils/canvas/meter/config";
import { createRings, drawRings, type RingSet } from "../utils/canvas/meter/rings";
import { createDial, drawDial, type DialState } from "../utils/canvas/meter/dial";
import { getComputedVariable } from "@utils/utils";
import type { SpeedtestData, UnitInfo } from "@src/types/speedtest";

export interface MeterRendererProps {
    speedtestData: SpeedtestData | null;
    currentStateName: string | undefined;
    isRunning: boolean;
    getSpeedtestStateAmount: (stateName: string, kind?: string) => number;
    getStateUnitInfo: (stateName: string, stateAmount?: number) => UnitInfo;
}

function normalize(x: number, min: number, max: number): number {
    return (x - min) / (max - min);
}

export function useMeterRenderer(
    meterRef: Ref<HTMLCanvasElement | null>,
    props: MeterRendererProps,
) {
    let canvas: Canvas | null = null;
    let config: MeterConfig | null = null;
    let rings: RingSet | null = null;
    let dial: DialState | null = null;
    let rafId: number | null = null;
    let isPlayingCompletion = false;
    let isCompleted = false;

    // SmoothProgress for exponentially-damped live value tracking
    const smooth = new SmoothProgress({ damping: 0.08, snapThreshold: 0.002 });

    function initialize(): void {
        const el = meterRef.value;
        if (!el) return;
        const ctx = el.getContext("2d");
        if (!ctx) return;

        const rect = el.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const fontSize = getComputedStyle(el).fontSize;

        config = computeMeterConfig(rect.width, rect.height, dpr, fontSize);
        el.width = config.canvasWidth;
        el.height = config.canvasHeight;

        canvas = new Canvas(el, ctx, [config.originX, config.originY]);

        const bgColor = getComputedVariable("--meter-background-color");
        const dialColor = getComputedVariable("--meter-dial-color");

        rings = createRings(config, bgColor, el);
        dial = createDial(config, dialColor);

        drawFrame(undefined, 0);

        if (props.isRunning) {
            startLoop();
        } else if (props.speedtestData) {
            const name = props.currentStateName;
            const phase = (name === "ping" || name === "download" || name === "upload")
                ? name
                : "upload";
            lastStateName = phase;
            isCompleted = true;
            drawFrame(phase, 1);
        }
    }

    // ── Drawing ───────────────────────────────────────────────────────

    function drawFrame(stateName: string | undefined, t: number): void {
        if (!canvas || !config || !rings || !dial) return;
        canvas.clear();

        drawRings(canvas, rings, stateName, t);
        const theta = lerp(Math.max(t, 0), config.startAngle, config.endAngle);
        drawDial(canvas, dial, stateName ? theta : config.startAngle);
    }

    // ── rAF render loop ───────────────────────────────────────────────

    let lastStateName: string | undefined;
    let lastFrameTime = 0;

    function startLoop(): void {
        stopLoop();
        lastFrameTime = performance.now();
        rafId = requestAnimationFrame(tick);
    }

    function stopLoop(): void {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function tick(now: number): void {
        if (isPlayingCompletion || isCompleted) return;
        if (!config || !props.speedtestData) {
            rafId = requestAnimationFrame(tick);
            return;
        }

        const dt = now - lastFrameTime;
        lastFrameTime = now;

        let name = props.currentStateName;
        if (name !== "ping" && name !== "download" && name !== "upload") {
            name = lastStateName;
        }
        if (!name) {
            rafId = requestAnimationFrame(tick);
            return;
        }

        if (name !== lastStateName && lastStateName) {
            // Phase transition: partially reset smooth progress
            smooth.reset(Math.max(smooth.current * 0.5, 0.02));
        }
        lastStateName = name;

        const amount = props.getSpeedtestStateAmount(name);
        const targetT = normalize(
            clamp(amount, config.minValue, config.maxValue),
            config.minValue,
            config.maxValue,
        );

        smooth.setTarget(targetT);
        const currentT = smooth.tickDt(dt);

        drawFrame(name, currentT);
        rafId = requestAnimationFrame(tick);
    }

    // ── Tween helper ───────────────────────────────────────────────────

    /** Drive a NumericAnimation over `durationMs`, calling `onFrame` each rAF. */
    function playTween(
        anim: NumericAnimation<{ t: number }>,
        durationMs: number,
        onFrame: (t: number) => void,
    ): Promise<void> {
        return new Promise((resolve) => {
            const start = performance.now();
            function frame(now: number) {
                const progress = Math.min((now - start) / durationMs, 1);
                onFrame(anim.at(progress).t);
                if (progress < 1) requestAnimationFrame(frame);
                else resolve();
            }
            requestAnimationFrame(frame);
        });
    }

    // ── Completion animation ──────────────────────────────────────────

    async function playCompletion(): Promise<void> {
        if (!canvas || !config || !rings || !dial || !lastStateName) return;
        isPlayingCompletion = true;
        const c = canvas, cfg = config, r = rings, d = dial, sn = lastStateName;

        const spinAnim = new NumericAnimation(
            [{ t: 0 }, { t: 1 }],
            { timingFunction: easeOutCubic },
        );
        await playTween(spinAnim, 2500, (t) => {
            c.clear();
            drawRings(c, r, sn, 1);
            drawDial(c, d, cfg.endAngle + t * Math.PI * 4);
        });

        isPlayingCompletion = false;
        isCompleted = true;
        drawFrame(sn, 1);
    }

    // ── Abort animation — smooth return to zero ──────────────────────

    async function playAbortReset(): Promise<void> {
        if (!canvas || !config || !rings || !dial) return;
        isPlayingCompletion = true;
        const c = canvas, cfg = config, r = rings, d = dial;
        const sn = lastStateName;
        const startT = smooth.current;

        const resetAnim = new NumericAnimation(
            [{ t: startT }, { t: 0 }],
            { timingFunction: easeOutCubic },
        );
        await playTween(resetAnim, 600, (t) => {
            c.clear();
            drawRings(c, r, sn, t);
            drawDial(c, d, lerp(Math.max(t, 0), cfg.startAngle, cfg.endAngle));
        });

        isPlayingCompletion = false;
        isCompleted = false;
        smooth.reset(0);
        lastStateName = undefined;
        drawFrame(undefined, 0);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────

    watch(() => props.currentStateName, (name) => {
        if (name === "ping" || name === "download" || name === "upload") {
            lastStateName = name;
        }
    });

    watch(() => props.isRunning, (running) => {
        if (running) {
            isPlayingCompletion = false;
            isCompleted = false;
            smooth.reset(0);
            startLoop();
        } else {
            stopLoop();
            if (lastStateName && config && props.speedtestData) {
                const amount = props.getSpeedtestStateAmount(lastStateName);
                if (amount > 0) {
                    playCompletion();
                } else {
                    playAbortReset();
                }
            }
        }
    });

    function dispose(): void {
        stopLoop();
    }

    return { initialize, dispose };
}
