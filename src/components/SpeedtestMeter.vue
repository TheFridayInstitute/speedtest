<template>
    <section class="speedtest-container relative w-full">
        <div class="speedtest relative aspect-square w-full">
            <canvas ref="canvasEl" class="absolute inset-0 h-full w-full"></canvas>
        </div>

        <div class="info-container">
            <div class="info">
                <div class="header">{{ headerText }}</div>

                <div class="unit-container">
                    <div class="amount" aria-label="active-test-speed">
                        <template v-if="displayAmount">{{ displayAmount }}</template>
                        <template v-else>&nbsp;</template>
                    </div>
                    <div class="unit font-mono italic">
                        <template v-if="displayUnit">{{ displayUnit }}</template>
                        <template v-else>&nbsp;</template>
                    </div>
                </div>

                <div class="footer">
                    <template v-if="footerText === 'Waiting...'">
                        <LoadingDots />
                    </template>
                    <template v-else>{{ footerText }}</template>
                </div>
            </div>

            <div class="kind">
                <template v-if="kindText">{{ kindText }}</template>
                <template v-else>&nbsp;</template>
            </div>
        </div>
    </section>
</template>

<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from "vue";
import type { ComputedRef } from "vue";
import LoadingDots from "./LoadingDots.vue";

import {
    Canvas,
    Polygon,
    Arc,
    Mesh,
    roundedArc,
    setRoundedArcColor,
    roundedRectangle,
    generateGradient,
    type CanvasColor,
} from "@utils/canvas/index";

import {
    lerp,
    normalize,
    clamp,
    slerpPoints,
    easeInOutCubic,
    hysteresis,
} from "@utils/math";

import { smoothAnimate, createRenderLoop } from "@utils/timing";

import {
    getOffset,
    emToPixels,
    getComputedVariable,
    generateColorStops,
    generateInnerColorStops,
} from "@utils/utils";

import type {
    SpeedtestData,
    TestStateObject,
    MeterObject,
    ProgressBarObject,
    UnitInfo,
} from "@src/types/speedtest";

// ── Props ──────────────────────────────────────────────────────────────

const props = defineProps<{
    /** Latest data payload from the speedtest worker. */
    speedtestData: SpeedtestData | null;
    /** Current human-readable state name (e.g. "download", "ping"). */
    currentStateName: string | undefined;
    /** Per-metric state tracker. */
    testStates: TestStateObject;
    /** Whether the speedtest is actively running. */
    isRunning: boolean;
    /** Get numeric state amount for a metric. */
    getSpeedtestStateAmount: (stateName: string, kind?: string) => number;
    /** Build a UnitInfo object for a given metric. */
    getStateUnitInfo: (stateName: string, stateAmount?: number) => UnitInfo;
}>();

// ── Template refs ──────────────────────────────────────────────────────

const canvasEl = ref<HTMLCanvasElement | null>(null);

// ── Canvas objects (mutated in-place, so use shallowRef) ───────────────

const canvasObject = shallowRef<Canvas | null>(null);

const meterObject = shallowRef<MeterObject>({
    startAngle: Math.PI * 0.8,
    endAngle: 2 * Math.PI * 1.1,
    minValue: 0,
    maxValue: 100,
    lineWidth: 0,
    backgroundColor: "",
});

const progressBarObject = shallowRef<ProgressBarObject>({
    color: "#fff",
    backgroundColor: "",
});

// ── Render loop reference ──────────────────────────────────────────────

let renderLoop: ReturnType<typeof createRenderLoop> | null = null;

// ── Computed display values for the meter info overlay ─────────────────

const activeUnitInfo: ComputedRef<UnitInfo> = computed(() => {
    const name = props.currentStateName;
    if (!name || !props.speedtestData) return {};
    if (name === "ping" || name === "download" || name === "upload") {
        return props.getStateUnitInfo(name);
    }
    return {};
});

const displayAmount: ComputedRef<string> = computed(() => {
    return activeUnitInfo.value.amount ?? "";
});

const displayUnit: ComputedRef<string> = computed(() => {
    return activeUnitInfo.value.unit ?? "";
});

const footerText: ComputedRef<string> = computed(() => {
    const name = props.currentStateName;
    if (name === "ping") return "Latency";
    if (name === "download") return "Download";
    if (name === "upload") return "Upload";
    if (name === "finished") return "Complete";
    return "Waiting...";
});

const kindText: ComputedRef<string> = computed(() => {
    const name = props.currentStateName;
    if (name === "download") return "\u2193";
    if (name === "upload") return "\u2191";
    return "";
});

const headerText: ComputedRef<string> = computed(() => {
    return "";
});

// ── Canvas meter drawing functions ─────────────────────────────────────

function drawMeter(stateName: string): void {
    const canvas = canvasObject.value;
    const meter = meterObject.value;
    if (!canvas || !meter.outerMeter || !meter.innerMeter || !meter.dial || !meter.dot) {
        return;
    }

    const { dot, outerMeter, innerMeter, dial, backgroundColor } = meter;

    let outerMeterColor: CanvasColor = backgroundColor;
    let innerMeterColor: CanvasColor = backgroundColor;

    if (stateName === "download") {
        outerMeterColor = outerMeter.dlColor;
        innerMeterColor = innerMeter.dlColor;
    } else if (stateName === "upload") {
        outerMeterColor = outerMeter.ulColor;
        innerMeterColor = innerMeter.ulColor;
    }

    if (!stateName) {
        setRoundedArcColor(outerMeter.mesh, backgroundColor);
        outerMeter.mesh.draw(canvas, 1);

        dot.mesh.draw(canvas);
        dial.mesh
            .rotate(meter.startAngle, true)
            .draw(canvas)
            .rotate(-meter.startAngle, true);
    } else {
        const stateAmount = props.getSpeedtestStateAmount(stateName);
        let t = normalize(
            clamp(stateAmount, meter.minValue, meter.maxValue),
            meter.minValue,
            meter.maxValue,
        );

        t = hysteresis(t, "meter");
        const theta = lerp(t, meter.startAngle, meter.endAngle);

        setRoundedArcColor(outerMeter.mesh, backgroundColor);
        outerMeter.mesh.draw(canvas, 1);

        // Draw twice to avoid aliasing around rounded end caps.
        setRoundedArcColor(outerMeter.mesh, outerMeterColor);
        outerMeter.mesh.draw(canvas, t);
        outerMeter.mesh.draw(canvas, t);

        setRoundedArcColor(outerMeter.mesh, backgroundColor);

        setRoundedArcColor(innerMeter.mesh, innerMeterColor);
        innerMeter.mesh.draw(canvas, t);

        dot.mesh.draw(canvas);
        dial.mesh.rotate(theta, true).draw(canvas).rotate(-theta, true);
    }
}

function drawMeterProgressBar(stateName?: string): void {
    const canvas = canvasObject.value;
    const pb = progressBarObject.value;
    if (!canvas || !pb.mesh) return;

    if (stateName == null) {
        pb.mesh.draw(canvas, 0);
    } else {
        const stateAmount = props.getSpeedtestStateAmount(stateName, "Progress");
        let t = clamp(stateAmount, 0, 1);
        t = hysteresis(t, "progressBar");
        pb.mesh.draw(canvas, t);
    }
}

// ── Opening animation (plays once when test starts) ────────────────────

async function openingAnimation(duration: number, timingFunc: any): Promise<void> {
    const canvas = canvasObject.value;
    const meter = meterObject.value;
    const pb = progressBarObject.value;

    if (!canvas || !meter.outerMeter || !meter.dial || !meter.dot || !pb.mesh) return;

    const { dot, outerMeter, dial } = meter;

    const transformFunc = function (_v: number, t: number) {
        canvas.clear();

        outerMeter.mesh.draw(canvas, t);
        dot.mesh.draw(canvas, t);

        const theta = lerp(
            t,
            meter.startAngle,
            meter.startAngle + 2 * Math.PI,
        );

        dial.mesh
            .rotate(theta, true)
            .scale(1)
            .draw(canvas)
            .rotate(-theta, true)
            .scale(1);

        pb.mesh.draw(canvas, 0);

        return false;
    };

    await smoothAnimate(
        meter.endAngle,
        meter.startAngle,
        duration,
        transformFunc,
        timingFunc,
    );
}

// ── Per-frame draw callback ────────────────────────────────────────────

function onDraw(): boolean | void {
    if (!props.speedtestData || !props.isRunning) {
        return false;
    }

    const stateName = props.currentStateName;

    if (
        stateName === "ping" ||
        stateName === "download" ||
        stateName === "upload"
    ) {
        const canvas = canvasObject.value;
        if (canvas) {
            canvas.clear();
        }
        drawMeter(stateName);
        drawMeterProgressBar(stateName);
    }

    return false;
}

// ── Canvas geometry setup (runs once on mount) ─────────────────────────

function initializeCanvas(): void {
    const canvas = canvasEl.value;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Read CSS variables for meter configuration.
    const fontSize = getComputedVariable("font-size");
    const bgColor = getComputedVariable("--meter-background-color");

    const dpr = window.devicePixelRatio || 1;
    const lineWidth = 2 * emToPixels(fontSize) * dpr;

    const canvasOffset = getOffset(canvas);
    canvas.width = canvasOffset.width * dpr;
    canvas.height = canvasOffset.height * dpr;

    const meterGap = lineWidth * 1.25;
    const outerRadius = canvas.width / 2 - lineWidth / 2;
    const innerRadius = outerRadius - meterGap;

    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    const newCanvas = new Canvas(canvas, ctx, [originX, originY]);
    canvasObject.value = newCanvas;

    // Create dial polygon.
    const dialBase = lineWidth / 1.2;
    const dialHeight = innerRadius * 0.8;
    const dialTop = dialBase / 1.8;

    const baseCoords = [
        [0, 0],
        [dialBase, 0],
    ];

    const points = slerpPoints(baseCoords[0], baseCoords[1]);

    const dialPoints = [
        ...points,
        [dialBase - dialTop, -dialHeight],
        [dialTop, -dialHeight],
    ];

    const startAngle = Math.PI * 0.8;
    const endAngle = 2 * Math.PI * 1.1;

    const dialColor = getComputedVariable("--meter-dial-color");
    const dialMesh = new Polygon(dialPoints, null, null, dialColor);
    dialMesh.translate(-dialMesh.centroid[0], 0).rotate(90, false);

    const outerMeterMesh = roundedArc(
        0,
        0,
        outerRadius,
        startAngle,
        endAngle,
        bgColor,
        lineWidth,
    );

    const innerMeterMesh = roundedArc(
        0,
        0,
        innerRadius,
        startAngle,
        endAngle,
        bgColor,
        lineWidth,
    );

    const dotMesh = new Arc(
        0,
        0,
        outerRadius / 5,
        0,
        Math.PI * 2,
        bgColor,
        1,
    );
    dotMesh.fillColor = dialColor;

    // Generate gradient colors.
    const dlColorStops = generateColorStops("dl-color");
    const ulColorStops = generateColorStops("ul-color");

    const outerDlColor = generateGradient(canvas, dlColorStops);
    const outerUlColor = generateGradient(canvas, ulColorStops);

    const innerDlColor = generateGradient(
        canvas,
        dlColorStops.map(generateInnerColorStops),
    );
    const innerUlColor = generateGradient(
        canvas,
        ulColorStops.map(generateInnerColorStops),
    );

    meterObject.value = {
        startAngle,
        endAngle,
        minValue: 0,
        maxValue: 100,
        lineWidth,
        backgroundColor: bgColor,
        outerMeter: {
            mesh: outerMeterMesh,
            radius: outerRadius,
            dlColor: outerDlColor,
            ulColor: outerUlColor,
        },
        innerMeter: {
            mesh: innerMeterMesh,
            radius: innerRadius,
            dlColor: innerDlColor,
            ulColor: innerUlColor,
        },
        dot: {
            color: "black",
            radius: outerRadius / 5,
            mesh: dotMesh,
        },
        dial: {
            color: bgColor,
            mesh: dialMesh,
        },
    };

    // Create progress bar mesh for the canvas.
    const barWidth = outerRadius;
    const barHeight = lineWidth / 2;

    const progressBar = roundedRectangle(0, 0, barWidth, barHeight, "#fff");
    const progressBarBackground = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        bgColor,
    );
    const progressBarMesh = new Mesh(
        progressBarBackground,
        progressBar,
    ).translate(0, outerRadius / 1.5 - barHeight / 2);

    progressBarMesh.draw = function (ctx: any, t: number) {
        this.shapes[0].draw(ctx, 1);
        this.shapes[1].draw(ctx, t);
        return this;
    };

    progressBarObject.value = {
        color: "#fff",
        backgroundColor: bgColor,
        mesh: progressBarMesh,
    };
}

// ── Watch for test start to play opening animation ─────────────────────

let hasPlayedOpening = false;

watch(
    () => props.isRunning,
    (running) => {
        if (running && !hasPlayedOpening) {
            hasPlayedOpening = true;
            openingAnimation(2000, easeInOutCubic);
        }
        if (running && renderLoop) {
            renderLoop.start();
        }
    },
);

// ── Lifecycle ──────────────────────────────────────────────────────────

onMounted(() => {
    initializeCanvas();

    // Create render loop with no-op update (state comes from composable watcher)
    // and the draw callback that renders the meter each frame.
    renderLoop = createRenderLoop({
        onUpdate: () => {},
        onDraw: () => onDraw(),
    });

    // If the test is already running on mount, start the loop.
    if (props.isRunning) {
        renderLoop.start();
    }
});

onUnmounted(() => {
    if (renderLoop) {
        renderLoop.dispose();
        renderLoop = null;
    }
});
</script>
