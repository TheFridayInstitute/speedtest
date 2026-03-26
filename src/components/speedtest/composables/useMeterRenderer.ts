/**
 * useMeterRenderer — thin orchestrator composable.
 * Delegates drawing to focused meter modules.
 */

import { watch, type Ref } from "vue";
import { Canvas } from "../utils/canvas/core";
import { computeMeterConfig, type MeterConfig } from "../utils/canvas/meter/config";
import { createRings, drawRings, type RingSet } from "../utils/canvas/meter/rings";
import { createDial, drawDial, type DialState } from "../utils/canvas/meter/dial";
import { createRenderLoop, smoothAnimate } from "@utils/timing";
import { lerp, normalize, clamp, easeOutCubic } from "@utils/math";
import { getComputedVariable } from "@utils/utils";
import type { SpeedtestData, UnitInfo } from "@src/types/speedtest";

export interface MeterRendererProps {
    speedtestData: SpeedtestData | null;
    currentStateName: string | undefined;
    isRunning: boolean;
    getSpeedtestStateAmount: (stateName: string, kind?: string) => number;
    getStateUnitInfo: (stateName: string, stateAmount?: number) => UnitInfo;
}

export function useMeterRenderer(
    meterRef: Ref<HTMLCanvasElement | null>,
    _glassRef: Ref<HTMLCanvasElement | null>,
    props: MeterRendererProps,
) {
    let canvas: Canvas | null = null;
    let config: MeterConfig | null = null;
    let rings: RingSet | null = null;
    let dial: DialState | null = null;
    let renderLoop: ReturnType<typeof createRenderLoop> | null = null;
    let isPlayingCompletion = false;
    let isCompleted = false;

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
        renderLoop = createRenderLoop({ onUpdate: () => {}, onDraw: () => onDraw() });

        if (props.isRunning) {
            renderLoop.start();
        } else if (props.speedtestData) {
            // Test already completed before this mount (e.g. navigated back).
            // Determine the last active phase to draw the filled final frame.
            const name = props.currentStateName;
            const phase = (name === "ping" || name === "download" || name === "upload")
                ? name
                : "upload"; // default to upload as the last phase
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

    // ── Smooth state tracking ─────────────────────────────────────────

    let lastStateName: string | undefined;
    let smoothT = 0;

    function onDraw(): boolean | void {
        if (!config || isPlayingCompletion) return false;

        // Completed state — persist the last frame (no animation needed)
        if (isCompleted) return false;

        if (!props.speedtestData) return false;

        let name = props.currentStateName;
        if (name !== "ping" && name !== "download" && name !== "upload") {
            name = lastStateName;
        }
        if (!name) return false;

        if (name !== lastStateName && lastStateName) {
            smoothT = Math.max(smoothT * 0.5, 0.02);
        }
        lastStateName = name;

        const amount = props.getSpeedtestStateAmount(name);
        const targetT = normalize(clamp(amount, config.minValue, config.maxValue), config.minValue, config.maxValue);

        smoothT += (targetT - smoothT) * 0.08;

        drawFrame(name, smoothT);
    }

    // ── Completion animation ──────────────────────────────────────────

    async function playCompletion(): Promise<void> {
        if (!canvas || !config || !rings || !dial || !lastStateName) return;
        isPlayingCompletion = true;
        const c = canvas, cfg = config, r = rings, d = dial, sn = lastStateName;

        // Smooth 2-revolution spin ending at the endAngle (2500ms)
        const startTheta = cfg.endAngle;
        await smoothAnimate(0, 1, 2500, (_v, t) => {
            c.clear();
            drawRings(c, r, sn, 1);
            const spinAngle = startTheta + t * Math.PI * 4;
            drawDial(c, d, spinAngle);
            return false;
        }, easeOutCubic);

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
        const startT = smoothT;

        await smoothAnimate(0, 1, 600, (_v, t) => {
            const currentT = startT * (1 - t);
            c.clear();
            drawRings(c, r, sn, currentT);
            const theta = lerp(Math.max(currentT, 0), cfg.startAngle, cfg.endAngle);
            drawDial(c, d, theta);
            return false;
        }, easeOutCubic);

        // Fully reset
        isPlayingCompletion = false;
        isCompleted = false;
        smoothT = 0;
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
            // Reset for new test (re-take)
            isPlayingCompletion = false;
            isCompleted = false;
            smoothT = 0;
            renderLoop?.start();
        } else {
            renderLoop?.stop();
            if (lastStateName && config && props.speedtestData) {
                const amount = props.getSpeedtestStateAmount(lastStateName);
                if (amount > 0) {
                    playCompletion();
                } else {
                    // Aborted — animate back to default
                    playAbortReset();
                }
            }
        }
    });

    function dispose(): void {
        renderLoop?.stop();
    }

    return { initialize, dispose };
}
