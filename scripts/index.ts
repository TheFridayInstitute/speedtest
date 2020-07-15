import {
    Polygon,
    Arc,
    Mesh,
    Canvas,
    roundedArc,
    setRoundedArcColor,
    roundedRectangle,
    CanvasColor,
    generateGradient
} from "./canvas";

import {
    clamp,
    lerp,
    normalize,
    easeInOutCubic,
    slerpPoints,
    bounceInEase
} from "./math";

import {
    smoothAnimate,
    animationLoopOuter,
    slideRight,
    sleep,
    slideLeft,
    createProgressBar,
    animateProgressBar,
    animateProgressBarWrapper,
    rippleButton,
    slideRightWrap,
    smoothScroll
} from "./animation.js";

import { getOffset, once, getComputedVariable, emToPixels } from "./utils.js";

import { Color } from "./colors.js";

import { $, $$, IDollarElement } from "./dollar";

// Global speedtest and event state variables.
let eventObj: MessageEvent;

let speedtestObject;
let speedtestData;

// Global state variables for the canvas
let canvasObject: Canvas;
// let meterDial: Polygon;
// let outerMeter: Mesh;
// let innerMeter: Mesh;
// let meterDot: Arc;
// let progressBarMesh: Mesh;

interface IMeterObject {
    startAngle: number;
    endAngle: number;

    minValue: number;
    maxValue: number;

    lineWidth: number;

    backgroundColor: CanvasColor;

    outerMeter?: {
        mesh: Mesh;
        radius: number;
        dlColor: CanvasColor;
        ulColor: CanvasColor;
    };

    innerMeter?: {
        mesh: Mesh;
        radius: number;
        dlColor: CanvasColor;
        ulColor: CanvasColor;
    };

    dial?: {
        color: CanvasColor;
        mesh: Polygon;
    };

    dot?: {
        color: CanvasColor;
        mesh: Arc;
        radius: number;
    };
}

interface IProgressBarObject {
    mesh?: Mesh;
    color: CanvasColor;
    backgroundColor: CanvasColor;
}

let meterObject: IMeterObject = {
    startAngle: Math.PI * 0.8,
    endAngle: 2 * Math.PI * 1.1,

    minValue: 0,
    maxValue: 100,

    lineWidth: 2 * emToPixels(getComputedVariable("font-size")),

    backgroundColor: getComputedVariable("--meter-background-color")
};

let progressBarObject: IProgressBarObject = {
    color: "#fff",
    backgroundColor: meterObject.backgroundColor
};

// const meterObject.startAngle = Math.PI * 0.8;
// const meterObject.endAngle = 2 * Math.PI * 1.1;
// const METER_MIN = 0;
// const METER_MAX = 100;

// let lineWidth = 2 * emToPixels(getComputedVariable("font-size"));

// let outerRadius: number;
// let innerRadius: number;
// const meterDotSize = 60;

const DOTS = `<div class="dot-container dot-typing"></div>`;

const BORDER_RADIUS_PRIMARY = getComputedVariable("--border-radius-primary");
// const meterObject.backgroundColor = getComputedVariable("--meter-background-color");
// const PROGRESS_BAR_COLOR = "#fff";
const PROGRESS_BAR_GRADIENT = getComputedVariable("--progress-bar-gradient");

const generateColorStops = function (
    colorName: string,
    step = 0.5
): Array<[number, string]> {
    const stops = Math.floor(1 / step) + 1;

    return Array(stops)
        .fill(0)
        .map(function (_, index) {
            const stop = index * step;
            const tmpColorName = `--${colorName}-${index}`;
            const color: string = getComputedVariable(tmpColorName);

            return [stop, color];
        });
};

const dlColorStops = generateColorStops("dl-color");
const ulColorStops = generateColorStops("ul-color");

// let dlProgressColor: CanvasColor;
// let dlProgressGlowColor: CanvasColor;

// let ulProgressColor: CanvasColor;
// let ulProgressGlowColor: CanvasColor;

const SPEEDTEST_STATES = Object.freeze({
    0: "not_started",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted"
});

const SPEEDTEST_DATA_MAPPING = Object.freeze({
    ping_amount: "pingStatus",
    download_amount: "dlStatus",
    upload_amount: "ulStatus",
    ping_progress: "pingStatus",
    download_progress: "dlProgress",
    upload_progress: "ulProgress"
});

/**
 * test state object mapping:
 * -1: not started;
 * 0: started;
 * 1: active;
 * 2: finished;
 * 3: manually set, drawing complete.
 */
const testStateObj = { ping: -1, download: -1, upload: -1, prev_state: -1 };

const updateTestState = function (
    testStateObj: { [s: string]: number },
    abort: boolean = false
) {
    // + 1 because we start at 0, not -1 (unlike librespeed).
    const speedtestState = speedtestData.testState + 1;
    const testKind = SPEEDTEST_STATES[speedtestState];
    const prevState = testStateObj["prev_state"];
    const prevKey = SPEEDTEST_STATES[prevState];

    if (abort || testKind === "aborted") {
        for (const [key] of Object.entries(testStateObj)) {
            testStateObj[key] = -1;
        }
    } else {
        for (const [key, value] of Object.entries(testStateObj)) {
            const state = value + 1;

            if (key === testKind) {
                if (value < 1) {
                    testStateObj[key] = state;
                } else if (value === 2 && speedtestState !== prevState) {
                    testStateObj[key] = 0;
                }
            } else if (key === prevKey && value > 0 && speedtestState !== prevState) {
                testStateObj[prevKey] = state;
                break;
            }
        }
        testStateObj["prev_state"] = speedtestState;
    }
    return testStateObj;
};

const hysteresisRecord = {};
const hysteresis = function (t: number, key: string, eps = 0.01, step = 1 / 15) {
    const prevT = hysteresisRecord[key] || 0;
    const delta = Math.abs(t - prevT);
    if (delta > eps) {
        // t = easeOutCubic(step, prevT, t - prevT, 1);
        t = lerp(step, prevT, t);
    }
    hysteresisRecord[key] = t;
    return t;
};

const getStateAmount = function (stateName: string) {
    const stateAmount = parseFloat(
        speedtestData[SPEEDTEST_DATA_MAPPING[stateName + "_amount"]]
    );
    return Number.isNaN(stateAmount) ? 0 : clamp(stateAmount, 0, 999);
};

const openingAnimation = async function (duration: number, timingFunc: any) {
    const transformFunc = function (v: number, t: number) {
        canvasObject.clear();

        meterDot.radius = (1 - t) * outerRadius + meterDotSize * t;

        outerMeter.draw(canvasObject, t);
        meterDot.draw(canvasObject, t);

        const theta = lerp(
            t,
            meterObject.startAngle,
            4 * Math.PI + meterObject.startAngle
        );

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObject)

            .rotate(-theta, true)
            .scale(1 / t);

        progressBarMesh.draw(canvasObject, 0);
    };
    await smoothAnimate(
        meterObject.endAngle,
        meterObject.startAngle,
        duration,
        transformFunc,
        timingFunc
    );
};

const closingAnimation = async function (duration: number, timingFunc: any) {
    const transformFunc = function (v: number, t: number) {
        canvasObject.clear();
        t = clamp(1 - t, 0.0001, 1);

        outerMeter.draw(canvasObject, t);
        meterDot.draw(canvasObject, t);

        const theta = lerp(
            t,
            meterObject.startAngle,
            4 * Math.PI + meterObject.startAngle
        );

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObject)

            .rotate(-theta, true)
            .scale(1 / t);

        progressBarMesh.draw(canvasObject, t);
    };
    await smoothAnimate(
        meterObject.endAngle,
        meterObject.startAngle,
        duration,
        transformFunc,
        timingFunc
    );
};

const drawMeter = function (
    stateName: string,
    outerMeterColor: CanvasColor,
    innerMeterColor: CanvasColor
) {
    if (!stateName) {
        setRoundedArcColor(outerMeter, meterObject.backgroundColor);
        outerMeter.draw(canvasObject, 1);

        meterDot.draw(canvasObject);
        meterDial
            .rotate(meterObject.startAngle, true)
            .draw(canvasObject)
            .rotate(-meterObject.startAngle, true);
    } else {
        const stateAmount = getStateAmount(stateName);

        $("#test-amount").innerHTML = stateAmount.toPrecision(3);

        let t = normalize(stateAmount, METER_MIN, METER_MAX);
        t = hysteresis(t, "meter");
        const theta = lerp(t, meterObject.startAngle, meterObject.endAngle);

        setRoundedArcColor(outerMeter, meterObject.backgroundColor);
        outerMeter.draw(canvasObject, 1);

        // Draw the meter twice here to avoid the weird aliasing
        // issue around the rounded end caps thereof.
        setRoundedArcColor(outerMeter, outerMeterColor);
        outerMeter.draw(canvasObject, t);
        outerMeter.draw(canvasObject, t);

        setRoundedArcColor(outerMeter, meterObject.backgroundColor);

        setRoundedArcColor(innerMeter, innerMeterColor);
        innerMeter.draw(canvasObject, t);

        meterDot.draw(canvasObject);
        meterDial.rotate(theta, true).draw(canvasObject).rotate(-theta, true);
    }
};

const drawMeterProgressBar = function (stateName: string) {
    if (!stateName) {
        progressBarMesh.draw(canvasObject, 0);
    } else {
        const stateProgress =
            parseFloat(
                speedtestData[SPEEDTEST_DATA_MAPPING[stateName + "_progress"]]
            ) || 0;
        let t = clamp(stateProgress, 0, 1);
        t = hysteresis(t, "progressBar");
        progressBarMesh.draw(canvasObject, t);
    }
};

const updateInfoUI = function (
    stateName: string,
    stateObj: {
        [x: string]: number;
    }
) {
    const stateKindEl = $("#" + stateName);
    const unitContainer = $(".unit-container", stateKindEl);
    const state = stateObj[stateName];

    if (state === 0) {
        unitContainer.querySelector(".amount").innerHTML = DOTS;
    } else if (state === 1) {
    } else if (state === 2) {
        animateProgressBarWrapper($("#progress-bar"), 1000, 3);

        unitContainer.classList.remove("in-progress");
        const stateAmount = getStateAmount(stateName);
        $(".amount", unitContainer).innerHTML = stateAmount.toPrecision(3);

        stateObj[stateName] = 3;
        animationLoopDraw();
    }
};

const animationLoopUpdate = function () {
    return false;
};

const animationLoopDraw = function () {
    if (speedtestData === null || speedtestObject.getState() != 3) {
        return false;
    }

    const prevState = testStateObj["prev_state"];
    const stateName = SPEEDTEST_STATES[prevState];
    updateTestState(testStateObj);

    if (stateName === "ping" || stateName === "download" || stateName === "upload") {
        updateInfoUI(stateName, testStateObj);
        // We need to clear the canvas here,
        // else we'll get a strange flashing
        // due to the canvas clearing faster than
        // we can draw.
        canvasObject.clear();

        if (stateName === "ping") {
            // drawMeter();
            // drawMeterProgressBar();
        } else if (stateName === "download") {
            drawMeter(stateName, dlProgressColor, dlProgressGlowColor);
            drawMeterProgressBar(stateName);
        } else if (stateName === "upload") {
            drawMeter(stateName, ulProgressColor, ulProgressGlowColor);
            drawMeterProgressBar(stateName);
        }
    } else if (stateName === "finished") {
        onend();
    }
};

const animationLoopInit = function () {
    // Cast the generic element to a canvas element for better linting.
    const canvas = <HTMLCanvasElement & IDollarElement>$("#test-meter");
    const ctx = canvas.getContext("2d");

    const canvasOffset = getOffset(canvas);
    const dpr = window.devicePixelRatio || 1;
    const lineWidth = meterObject.lineWidth * dpr;

    canvas.width = canvasOffset.width * dpr;
    canvas.height = canvasOffset.height * dpr;
    const meterGap = lineWidth * 1.25;

    const outerRadius = canvas.width / 2 - lineWidth / 2;
    const innerRadius = outerRadius - meterGap;

    const originX = canvas.width / 2;
    const originY = canvas.height / 2;

    canvasObject = new Canvas(canvas, ctx, [originX, originY]);

    // Creation of the meter polygons.

    const dialBase = lineWidth / 1.2;
    const dialHeight = innerRadius * 0.8;
    const dialTop = dialBase / 1.8;

    const baseCoords = [
        [0, 0],
        [dialBase, 0]
    ];

    const points = slerpPoints(baseCoords[0], baseCoords[1]);

    const dialPoints = [
        ...points,
        [dialBase - dialTop, -dialHeight],
        [dialTop, -dialHeight]
    ];

    const dialMesh = new Polygon(dialPoints, null, null, "white");
    dialMesh.translate(-dialMesh.centroid[0], 0).rotate(90, false);

    const outerMeterMesh = roundedArc(
        0,
        0,
        outerRadius,
        meterObject.startAngle,
        meterObject.endAngle,
        meterObject.backgroundColor,
        lineWidth
    );

    const innerMeterMesh = roundedArc(
        0,
        0,
        innerRadius,
        meterObject.startAngle,
        meterObject.endAngle,
        meterObject.backgroundColor,
        lineWidth
    );

    const dotMesh = new Arc(
        0,
        0,
        outerRadius / 5,
        0,
        Math.PI * 2,
        meterObject.backgroundColor,
        1
    );
    dotMesh.fillColor = meterObject.backgroundColor;

    // Creation of the speedtest colors for the meters.
    const outerDlColor = generateGradient(canvas, dlColorStops);
    const outerUlColor = generateGradient(canvas, ulColorStops);

    const genInnerMeterColor = function (value: [number, string]): [number, string] {
        const [stop, color] = value;
        const newColor = new Color(color);
        newColor.opacity = 0.3;
        return [stop, newColor.colorString];
    };

    const innerDlColor = generateGradient(canvas, dlColorStops.map(genInnerMeterColor));
    const innerUlColor = generateGradient(canvas, ulColorStops.map(genInnerMeterColor));

    meterObject = Object.assign(meterObject, {
        outerMeter: {
            mesh: outerMeterMesh,
            radius: outerRadius,
            dlColor: outerDlColor,
            ulColor: outerUlColor
        },

        innerMeter: {
            mesh: innerMeterMesh,
            radius: innerRadius,
            dlColor: innerDlColor,
            ulColor: innerUlColor
        },

        dot: {
            color: "black",
            radius: outerRadius / 5,
            mesh: dotMesh
        },

        dial: {
            color: meterObject.backgroundColor,
            mesh: dialMesh
        }
    });

    // Meter progress bar creation.Î
    const barWidth = outerRadius;
    const barHeight = lineWidth / 4;

    const progressBar = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        progressBarObject.color
    );
    const progressBarBackground = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        progressBarObject.backgroundColor
    );
    const progressBarMesh = new Mesh(progressBarBackground, progressBar).translate(
        0,
        outerRadius / 1.5 - barHeight / 2
    );
    progressBarMesh.draw = function (ctx, t) {
        this.shapes[0].draw(ctx, 1);
        this.shapes[1].draw(ctx, t);
        return this;
    };

    progressBarObject = Object.assign(progressBarObject, {
        mesh: progressBarMesh
    });
};

const speedtestOnUpdate = function (data) {
    speedtestData = data;
};

const speedtestOnEnd = function () {
    $("#start-btn").classList.remove("running");
    animationLoopDraw();
};

async function onload() {
    // @ts-ignore
    speedtestObject = new Speedtest();
    speedtestObject.setParameter("getIp_ispInfo", false);
    speedtestObject.setParameter("getIp_ispInfo_distance", false);

    speedtestObject.onupdate = speedtestOnUpdate;
    speedtestObject.onend = speedtestOnEnd;

    // Progress bar for the speedtest as a whole.
    // The progress bar object is for an individual state.
    createProgressBar(
        $("#progress-bar"),
        [PROGRESS_BAR_GRADIENT],
        {
            styles: {
                "border-top-left-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-left-radius": BORDER_RADIUS_PRIMARY
            }
        },
        {
            styles: {
                "border-top-right-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-right-radius": BORDER_RADIUS_PRIMARY
            }
        }
    );
}

const openingSlide = once(async function () {
    const testEl = $("#test-pane");
    const infoEl = $("#info-progress-container");

    const startModal = $("#start-pane");
    const completeModal = $("#complete-pane");

    const width = window.innerWidth;

    slideRight([testEl, infoEl, completeModal], width, 0, 1);
    [testEl, infoEl].forEach((el) => el.classList.remove("hidden"));

    await slideLeft(startModal, -width, 0, 500);
    startModal.classList.add("hidden");
    slideLeft([testEl, infoEl], 0, width, 500);

    await openingAnimation(2000, easeInOutCubic);
});

async function onstart() {
    const startButton = $("#start-btn");

    if (speedtestObject.getState() === 3) {
        speedtestObject.abort();
        startButton.classList.remove("running");
        $(".text", startButton).innerHTML = "Start";

        updateTestState(testStateObj, true);
        openingAnimation(2000, bounceInEase);

        await sleep(500);

        $("#test-amount").innerHTML = "0";

        $$(".info-container .unit-container").forEach((el) => {
            el.classList.add("in-progress");
            $(".amount", el).innerHTML = "0";
        });
        animateProgressBarWrapper($("#progress-bar"), 1000, 3);
    } else {
        startButton.classList.add("running");
        $(".text", startButton).innerHTML = "Stop";

        speedtestObject.start();

        openingSlide();
        smoothScroll(
            getOffset($("#test-meter")).top - window.innerHeight / 2,
            window.scrollY,
            1000
        );
    }
}

async function onend() {
    const startButton = $("#start-btn");
    const testEl = $("#test-pane");
    const completeModal = $("#complete-pane");
    const width = window.innerWidth;

    await closingAnimation(2000, easeInOutCubic);

    await slideLeft(testEl, -width, 0, 500);
    testEl.classList.add("hidden");
    slideRight(completeModal, 0, -width, 500);
    completeModal.classList.remove("hidden");

    await slideRightWrap(startButton, 0, 0, 500, function () {
        $(".text", startButton).innerHTML = "Next →";
    });

    await sleep(2000);

    const ip = String(speedtestData.clientIp).trim().split(" ")[0].trim();

    const outData = {
        dlStatus: speedtestData.dlStatus,
        ulStatus: speedtestData.ulStatus,
        pingStatus: speedtestData.pingStatus,
        jitterStatus: speedtestData.jitterStatus,
        ip: ip
    };

    if (eventObj !== null) {
        console.log(`Payload of speedtest data sent: ${outData}`);
        //@ts-ignore
        // TODO: Figure out why this doesn't type correctly.
        eventObj.source.postMessage(JSON.stringify(outData), eventObj.origin);
    } else {
        console.log(`Failed to post speedtest data to external event.`);
    }
}

window.onload = function () {
    onload();
    animationLoopInit();
    animationLoopOuter(animationLoopUpdate, animationLoopDraw);
};

$("#start-btn").on("click", function (ev) {
    const duration = 1000;

    rippleButton(ev, ev.target, $("#start-btn .ripple"), 15, 0, duration);

    if (testStateObj["upload"] === 3) {
        if (eventObj !== null) {
            console.log("Posting next message.");
            //@ts-ignore
            eventObj.source.postMessage("next", eventObj.origin);
        } else {
            console.log("Cannot post to null event object. Aborting...");
            $(".modal").classList.toggle("visible");
        }
    } else {
        onstart();
    }
});

$(window).on("click touchend", function (ev) {
    const modal = $(".modal-content");

    if (ev.target == modal || ev.target == modal.parentElement) {
        modal.parentElement.classList.toggle("visible");
    }
});

const receiveMessage = function (event: MessageEvent) {
    // TODO: add secret key here?
    if (event.data === "start") {
        eventObj = event;
    }
    console.log(`Received event of ${event}`);
};

$(window).on("message", receiveMessage);
