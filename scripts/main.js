import {
    Polygon,
    Arc,
    Mesh,
    generateGradientWrapper,
    Canvas,
    roundedArc,
    setRoundedArcColor,
    roundedRectangle,
} from "./canvas.js";

import {
    clamp,
    lerp,
    smoothStep3,
    normalize,
    easeInOutCubic,
    slerpPoints,
} from "./math.js";

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
} from "./animation.js";

import { getOffset, once, getComputedVariable, fluidText } from "./utils.js";

import { Color } from "./colors.js";

// Global speedtest and event state variables.
var eventObj = null;
var speedtestObj = null;
var speedtestData = null;

// Global state variables for the canvas
var canvasObj;
var meterDial;
var outerMeter;
var innerMeter;
var meterDot;
var progressBarMesh;
var progressBarEl;

const METER_ANGLE_START = Math.PI * 0.8;
const METER_ANGLE_END = 2 * Math.PI * 1.1;
const METER_MIN = 0;
const METER_MAX = 100;

// Keep this constant.
var lineWidth = 32;

var outerRadius;
var innerRadius;
var meterDotSize = 60;

const BORDER_RADIUS_PRIMARY = getComputedVariable("--border-radius-primary");
const METER_BACKGROUND_COLOR = getComputedVariable("--meter-background-color");
const PROGRESS_BAR_COLOR = "#fff";
const PROGRESS_BAR_GRADIENT = getComputedVariable("--progress-bar-gradient");

var dlColorStops = [
    ["0", "#8630e6"],
    ["0.5", "#d359ff"],
    ["1.0", "#f71e6a"],
];

var ulColorStops = [
    ["0", "#FF8000"],
    ["0.5", "#FF8000"],
    ["1.0", "#FF0000"],
];

var dlProgressColor;
var dlProgressGlowColor;

var ulProgressColor;
var ulProgressGlowColor;

let makeGlowColor = function (value) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.opacity = 0.3;
    return [stop, newColor.colorString];
};

// TODO: This doesn't work. Fix it.
function hysteresis(t, prevT, eps = 0.01) {
    if (t - prevT > eps) {
        t = prevT + eps;
    } else if (t - prevT < -eps) {
        t = prevT - eps;
    }
    prevT = t;
    return [t, prevT];
}

function receiveMessage(event) {
    if (event.data === "start") {
        eventObj = event;
    }
    console.log(`Received event of ${event}`);
}

const SPEEDTEST_STATES = Object.freeze({
    0: "not_started",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted",
});

/**
 * test state object mapping:
 * -1: not started;
 * 0: started;
 * 1: active;
 * 2: finished;
 * 3: manually set, drawing complete.
 */
var testStateObj = { ping: -1, download: -1, upload: -1, prev_state: -1 };

function updateTestState(speedtestState, testStateObj, abort = false) {
    // + 1 because we start at 0, not -1 (unlike librespeed).
    speedtestState += 1;
    let testKind = SPEEDTEST_STATES[speedtestState];
    let prevState = testStateObj["prev_state"];
    let prevKey = SPEEDTEST_STATES[prevState];

    if (abort || testKind === "aborted") {
        for (let [key] of Object.entries(testStateObj)) {
            testStateObj[key] = -1;
        }
    } else {
        for (let [key, value] of Object.entries(testStateObj)) {
            let state = value + 1;

            if (key === testKind) {
                if (value < 1) {
                    testStateObj[key] = state;
                } else if (value === 2 && speedtestState !== prevState) {
                    testStateObj[key] = 0;
                }
            } else if (
                key === prevKey &&
                value > 0 &&
                speedtestState !== prevState
            ) {
                testStateObj[prevKey] = state;
            }
        }
        testStateObj["prev_state"] = speedtestState;
    }
    return testStateObj;
}

var prevT = 0;
var eps = 0.05;
function drawMeter(
    status,
    meterTextEl,
    meterAmount,
    progressAmount,
    progressColor,
    progressGlowColor
) {
    canvasObj.clear();

    meterAmount = parseFloat(meterAmount) || 0;
    progressAmount = parseFloat(progressAmount) || 0;

    if (status === 1 && meterAmount === 0) {
        meterTextEl.innerHTML = "0";
    } else {
        meterTextEl.innerHTML = clamp(meterAmount.toPrecision(3), 0, 999);
    }

    let t = normalize(
        clamp(meterAmount, METER_MIN, METER_MAX),
        METER_MIN,
        METER_MAX
    );
    // [t, prevT] = hysteresis(t, prevT, eps);
    let theta = lerp(t, METER_ANGLE_START, METER_ANGLE_END);

    outerMeter.draw(canvasObj, 1);
    setRoundedArcColor(outerMeter, progressColor);
    outerMeter.draw(canvasObj, t);
    setRoundedArcColor(outerMeter, METER_BACKGROUND_COLOR);

    setRoundedArcColor(innerMeter, progressGlowColor);
    innerMeter.draw(canvasObj, t);

    meterDot.draw(canvasObj);

    meterDial.rotate(theta, true).draw(canvasObj).rotate(-theta, true);

    progressBarMesh.draw(canvasObj, clamp(progressAmount, 0, 1));
}

let openingAnimation = function (duration, timingFunc) {
    let transformFunc = function (v, t) {
        canvasObj.clear();

        outerMeter.radius = outerRadius * t;
        innerMeter.radius = innerRadius * t;

        meterDot.radius = (1 - t) * outerRadius + meterDotSize * t;

        outerMeter.draw(canvasObj, t);
        meterDot.draw(canvasObj, t);

        let theta = lerp(t, METER_ANGLE_START, 4 * Math.PI + METER_ANGLE_START);

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObj)

            .rotate(-theta, true)
            .scale(1 / t);
    };
    smoothAnimate(
        METER_ANGLE_END,
        METER_ANGLE_START,
        duration,
        transformFunc,
        timingFunc
    );
};

let closingAnimation = function (duration, timingFunc) {
    let transformFunc = function (v, t) {
        canvasObj.clear();
        t = clamp(1 - t, 0.0001, 1);

        outerMeter.radius = outerRadius * t;
        meterDot.radius = meterDotSize * t;

        outerMeter.draw(canvasObj, t);
        meterDot.draw(canvasObj, t);

        let theta = lerp(t, METER_ANGLE_START, 4 * Math.PI + METER_ANGLE_START);

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObj)

            .rotate(-theta, true)
            .scale(1 / t);
    };
    smoothAnimate(
        METER_ANGLE_END,
        METER_ANGLE_START,
        duration,
        transformFunc,
        timingFunc
    );
};

let updateFunc = function () {
    return false;
};

let dots = `...`;

let updateUI = function (state, amount) {
    let stateKindEl = document.getElementById(state);
    let unitContainer = stateKindEl.querySelector(".unit-container");

    let testState = testStateObj[state];

    if (testState === 0 || testState === 1) {
        unitContainer.querySelector(".amount").innerHTML = dots;
    } else if (testState === 2) {
        let fAmount = clamp(Math.round(parseFloat(amount)), 0, 999);
        animateProgressBarWrapper(progressBarEl, 1000, 3);
        unitContainer.classList.remove("in-progress");
        unitContainer.querySelector(".amount").innerHTML = fAmount;
        testStateObj[state] = 3;
    }
};

let drawFunc = function () {
    if (speedtestObj.getState() != 3 || speedtestData === null) {
        return false;
    }

    // let speedtestState = SPEEDTEST_STATES[speedtestData.testState + 1];
    let speedtestState = SPEEDTEST_STATES[testStateObj["prev_state"]];
    console.log(speedtestState, testStateObj[speedtestState]);

    if (speedtestState === "ping") {
        updateUI(speedtestState, speedtestData.pingStatus);
    } else if (speedtestState === "download") {
        updateUI(speedtestState, speedtestData.dlStatus);
    } else if (speedtestState === "upload") {
        updateUI(speedtestState, speedtestData.ulStatus);
    } else {
    }

    updateTestState(speedtestData.testState, testStateObj);
};

let initFunc = function () {
    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let canvasOffset = getOffset(canvas);
    let dpr = window.devicePixelRatio || 1;
    lineWidth *= dpr;

    canvas.width = canvasOffset.width * dpr;
    canvas.height = canvasOffset.height * dpr;
    let meterGap = lineWidth * 1.25;

    outerRadius = canvas.width / 2 - lineWidth / 2;
    innerRadius = outerRadius - meterGap;

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    dlProgressColor = generateGradientWrapper(canvas, dlColorStops);
    ulProgressColor = generateGradientWrapper(canvas, ulColorStops);

    dlProgressGlowColor = generateGradientWrapper(
        canvas,
        dlColorStops.map(makeGlowColor)
    );
    ulProgressGlowColor = generateGradientWrapper(
        canvas,
        ulColorStops.map(makeGlowColor)
    );

    let dialBase = lineWidth / 1.2;
    let dialHeight = innerRadius * 0.8;
    let dialTop = dialBase / 1.8;

    // Initializing polygons
    let base = [
        [0, 0],
        [dialBase, 0],
    ];

    let points = slerpPoints(base[0], base[1]);

    let meterPoints = [
        ...points,
        [dialBase - dialTop, -dialHeight],
        [dialTop, -dialHeight],
    ];

    meterDial = new Polygon(meterPoints, null, null, "white");
    // Centering the meter meterDial and laying it flat.
    meterDial.translate(-meterDial.centroid[0], 0).rotate(90, false);

    outerMeter = roundedArc(
        0,
        0,
        outerRadius,
        METER_ANGLE_START,
        METER_ANGLE_END,
        METER_BACKGROUND_COLOR,
        lineWidth
    );

    innerMeter = roundedArc(
        0,
        0,
        innerRadius,
        METER_ANGLE_START,
        METER_ANGLE_END,
        METER_BACKGROUND_COLOR,
        lineWidth
    );

    meterDot = new Arc(
        0,
        0,
        outerRadius / 5,
        0,
        Math.PI * 2,
        METER_BACKGROUND_COLOR,
        1
    );
    meterDot.fillColor = METER_BACKGROUND_COLOR;

    let barWidth = outerRadius;
    let barHeight = lineWidth / 4;

    let progressBar = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        PROGRESS_BAR_COLOR
    );
    let progressBarBackground = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        METER_BACKGROUND_COLOR
    );
    progressBarMesh = new Mesh(progressBarBackground, progressBar).translate(
        0,
        outerRadius / 1.5 - barHeight / 2
    );
    progressBarMesh.draw = function (ctx, t) {
        this.shapes[0].draw(ctx, 1);
        this.shapes[1].draw(ctx, t);
    };

    canvasObj = new Canvas(canvas, ctx, [originX, originY]);
};

let speedtestOnUpdate = function (data) {
    speedtestData = data;
};

let speedtestOnEnd = function (aborted) {
    document.getElementById("start-btn").classList.remove("running");
    // Draw to the screen once more, wherein we'll call onend.
    drawFunc();
};

async function onload() {
    speedtestObj = new Speedtest();
    speedtestObj.setParameter("getIp_ispInfo", false);
    speedtestObj.setParameter("getIp_ispInfo_distance", false);

    speedtestObj.onupdate = speedtestOnUpdate;
    speedtestObj.onend = speedtestOnEnd;

    progressBarEl = document.getElementById("progress-bar");
    createProgressBar(
        progressBarEl,
        [PROGRESS_BAR_GRADIENT],
        {
            styles: {
                "border-top-left-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-left-radius": BORDER_RADIUS_PRIMARY,
            },
        },
        {
            styles: {
                "border-top-right-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-right-radius": BORDER_RADIUS_PRIMARY,
            },
        }
    );

    fluidText(
        document.getElementById("test-amount"),
        document.getElementById("test-amount").parentElement.parentElement,
        true,
        ["font-size"]
    );
}

let openingSlide = once(async function () {
    let duration = 1000;
    let testEl = document.getElementById("test-modal");
    let infoEl = document.getElementById("info-progress-container");

    let startModal = document.getElementById("start-modal");
    let completeModal = document.getElementById("complete-modal");

    let width = window.innerWidth;

    slideRight([testEl, infoEl], width, 0, 1);
    testEl.classList.remove("hidden");
    infoEl.classList.remove("hidden");

    completeModal.style.transform = `translateX(${-width}px)`;

    await slideLeft(startModal, -width, 0, 500);
    await slideLeft([testEl, infoEl], 0, width, 500);

    startModal.classList.add("hidden");

    openingAnimation(duration, smoothStep3);
});

async function onstart() {
    if (speedtestObj.getState() === 3) {
        speedtestObj.abort();
        document.getElementById("start-btn").classList.remove("running");
        document.querySelector("#start-btn .text").innerHTML = "Start";

        updateTestState(speedtestData.testState, testStateObj, true);
        openingAnimation(1000, smoothStep3);

        await sleep(500);

        document.getElementById("test-amount").innerHTML = "0";

        document
            .querySelectorAll(".test-info-container .unit-container")
            .forEach((el) => {
                el.classList.add("in-progress");
                el.querySelector(".amount").innerHTML = "0";
            });
        animateProgressBar(
            progressBarEl,
            0,
            parseFloat(progressBarEl.getAttribute("percent-complete")),
            1000
        );
    } else {
        document.getElementById("start-btn").classList.add("running");
        document.querySelector("#start-btn .text").innerHTML = "Stop";
        speedtestObj.start();
    }

    openingSlide();
}

async function onend() {
    let duration = 2000;
    let buttonEl = document.getElementById("start-btn");
    let testEl = document.getElementById("test-modal");
    let completeModal = document.getElementById("complete-modal");
    let width = window.innerWidth;

    closingAnimation(duration, easeInOutCubic);

    completeModal.classList.remove("hidden");

    slideRight(testEl, width, 0);
    slideRight(completeModal, 0, -width);

    await slideRightWrap(buttonEl, 0, 0, 1000, function () {
        document.querySelector("#start-btn .text").innerHTML = "Next →";
    });
    testEl.classList.add("hidden");

    await sleep(duration);

    let ip = String(speedtestData.clientIp).trim().split(" ")[0].trim();

    let outData = {
        dlStatus: speedtestData.dlStatus,
        ulStatus: speedtestData.ulStatus,
        pingStatus: speedtestData.pingStatus,
        jitterStatus: speedtestData.jitterStatus,
        ip: ip,
    };

    if (eventObj !== null) {
        console.log(`Payload of speedtest data sent: ${outData}`);
        eventObj.source.postMessage(JSON.stringify(outData), eventObj.origin);
    } else {
        console.log(`Failed to post speedtest data to external event.`);
    }
}

window.onload = function () {
    onload();
    initFunc();
    animationLoopOuter(updateFunc, drawFunc);
};

document.getElementById("start-btn").addEventListener("click", function (ev) {
    let duration = 1000;

    rippleButton(
        ev,
        this,
        document.querySelector("#start-btn .ripple"),
        15,
        0,
        duration
    );

    // If the speedtest is complete.
    if (testStateObj["upload"] === 3) {
        if (eventObj !== null) {
            console.log("Posting next message.");
            eventObj.source.postMessage("next", eventObj.origin);
        }
    } else {
        onstart();
    }
});

window.addEventListener("message", receiveMessage, false);
