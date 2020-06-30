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
    bounceInEase,
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
    smoothScroll,
} from "./animation.js";

import {
    getOffset,
    once,
    getComputedVariable,
    emToPixels,
    addEventListeners,
} from "./utils.js";

import { Color } from "./colors.js";

var animationLoopHandle = null;

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

var lineWidth = 2 * emToPixels(getComputedVariable("font-size"));

var outerRadius;
var innerRadius;
var meterDotSize = 60;

const DOTS = `<div class="dot-container dot-typing"></div>`;

const BORDER_RADIUS_PRIMARY = getComputedVariable("--border-radius-primary");
const METER_BACKGROUND_COLOR = getComputedVariable("--meter-background-color");
const PROGRESS_BAR_COLOR = "#fff";
const PROGRESS_BAR_GRADIENT = getComputedVariable("--progress-bar-gradient");

let generateColorStops = function (colorName, step = 0.5) {
    let stops = Math.floor(1 / step) + 1;
    return new Array(stops).fill().map(function (_, index) {
        let stop = `${index * step}`;
        let tmpColorName = `--${colorName}-${index}`;
        let color = getComputedVariable(tmpColorName);
        color = color === "" ? "black" : color;
        return [stop, color];
    });
};

var dlColorStops = generateColorStops("dl-color");
var ulColorStops = generateColorStops("ul-color");

var dlProgressColor;
var dlProgressGlowColor;

var ulProgressColor;
var ulProgressGlowColor;

const SPEEDTEST_STATES = Object.freeze({
    0: "not_started",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted",
});

const SPEEDTEST_DATA_MAPPING = Object.freeze({
    ping_amount: "pingStatus",
    download_amount: "dlStatus",
    upload_amount: "ulStatus",
    ping_progress: "pingStatus",
    download_progress: "dlProgress",
    upload_progress: "ulProgress",
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

let updateTestState = function (testStateObj, abort = false) {
    // + 1 because we start at 0, not -1 (unlike librespeed).
    let speedtestState = speedtestData.testState + 1;
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
                break;
            }
        }
        testStateObj["prev_state"] = speedtestState;
    }
    return testStateObj;
};

var hysteresisRecord = {};
let hysteresis = function (t, key, eps = 0.01, step = 1 / 15) {
    let prevT = hysteresisRecord[key] || 0;
    let delta = Math.abs(t - prevT);
    if (delta > eps) {
        // t = easeOutCubic(step, prevT, t - prevT, 1);
        t = lerp(step, prevT, t);
    }
    hysteresisRecord[key] = t;
    return t;
};

let openingAnimation = async function (duration, timingFunc) {
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

        progressBarMesh.draw(canvasObj, 0);
    };
    await smoothAnimate(
        METER_ANGLE_END,
        METER_ANGLE_START,
        duration,
        transformFunc,
        timingFunc
    );
};

let closingAnimation = async function (duration, timingFunc) {
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

        progressBarMesh.draw(canvasObj, t);
    };
    await smoothAnimate(
        METER_ANGLE_END,
        METER_ANGLE_START,
        duration,
        transformFunc,
        timingFunc
    );
};

let drawMeter = function (stateName, outerMeterColor, innerMeterColor) {
    if (!stateName) {
        setRoundedArcColor(outerMeter, METER_BACKGROUND_COLOR);
        outerMeter.draw(canvasObj, 1);

        meterDot.draw(canvasObj);
        meterDial
            .rotate(METER_ANGLE_START, true)
            .draw(canvasObj)
            .rotate(-METER_ANGLE_START, true);
    } else {
        let stateAmount = parseFloat(
            speedtestData[SPEEDTEST_DATA_MAPPING[stateName + "_amount"]]
        );
        stateAmount = Number.isNaN(stateAmount)
            ? 0
            : clamp(stateAmount.toPrecision(3), 0, 999);

        document.getElementById("test-amount").innerHTML = stateAmount;

        let t = normalize(
            clamp(stateAmount, METER_MIN, METER_MAX),
            METER_MIN,
            METER_MAX
        );
        t = hysteresis(t, "meter");
        let theta = lerp(t, METER_ANGLE_START, METER_ANGLE_END);

        setRoundedArcColor(outerMeter, METER_BACKGROUND_COLOR);
        outerMeter.draw(canvasObj, 1);

        // Draw the meter twice here to avoid the weird aliasing
        // issue around the rounded end caps thereof.
        setRoundedArcColor(outerMeter, outerMeterColor);
        outerMeter.draw(canvasObj, t);
        outerMeter.draw(canvasObj, t);

        setRoundedArcColor(outerMeter, METER_BACKGROUND_COLOR);

        setRoundedArcColor(innerMeter, innerMeterColor);
        innerMeter.draw(canvasObj, t);

        meterDot.draw(canvasObj);
        meterDial.rotate(theta, true).draw(canvasObj).rotate(-theta, true);
    }
};

let drawProgressBar = function (stateName) {
    if (!stateName) {
        progressBarMesh.draw(canvasObj, 0);
    } else {
        let stateProgress =
            parseFloat(
                speedtestData[SPEEDTEST_DATA_MAPPING[stateName + "_progress"]]
            ) || 0;
        let t = clamp(stateProgress, 0, 1);
        t = hysteresis(t, "progressBar");
        progressBarMesh.draw(canvasObj, t);
    }
};

let updateInfoUI = function (stateName, stateObj) {
    let stateKindEl = document.getElementById(stateName);
    let unitContainer = stateKindEl.querySelector(".unit-container");
    let state = stateObj[stateName];

    if (state === 0) {
        unitContainer.querySelector(".amount").innerHTML = DOTS;
    } else if (state === 1) {
    } else if (state === 2) {
        let stateAmount =
            speedtestData[SPEEDTEST_DATA_MAPPING[stateName + "_amount"]];

        animateProgressBarWrapper(progressBarEl, 1000, 3);
        unitContainer.classList.remove("in-progress");
        unitContainer.querySelector(".amount").innerHTML = clamp(
            Math.round(parseFloat(stateAmount)),
            0,
            999
        );
        stateObj[stateName] = 3;
        animationLoopDraw();
    }
};

let animationLoopUpdate = function () {
    return false;
};

let animationLoopDraw = function () {
    if (speedtestData === null || speedtestObj.getState() != 3) {
        return false;
    }

    let prevState = testStateObj["prev_state"];
    let stateName = SPEEDTEST_STATES[prevState];
    updateTestState(testStateObj);

    if (
        stateName === "ping" ||
        stateName === "download" ||
        stateName === "upload"
    ) {
        updateInfoUI(stateName, testStateObj);
        // We need to clear the canvas here,
        // else we'll get a strange flashing
        // due to the canvas clearing faster than
        // we can draw.
        canvasObj.clear();

        if (stateName === "ping") {
            drawMeter();
            drawProgressBar();
        } else if (stateName === "download") {
            drawMeter(stateName, dlProgressColor, dlProgressGlowColor);
            drawProgressBar(stateName);
        } else if (stateName === "upload") {
            drawMeter(stateName, ulProgressColor, ulProgressGlowColor);
            drawProgressBar(stateName);
        }
    } else if (stateName === "finished") {
        onend();
    }
};

let animationLoopInit = function () {
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
    let originY = canvas.height / 2 ;

    dlProgressColor = generateGradientWrapper(canvas, dlColorStops);
    ulProgressColor = generateGradientWrapper(canvas, ulColorStops);

    let makeGlowColor = function (value) {
        let [stop, color] = value;
        let newColor = new Color(color);
        newColor.opacity = 0.3;
        return [stop, newColor.colorString];
    };

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

let speedtestOnEnd = function () {
    document.getElementById("start-btn").classList.remove("running");
    animationLoopDraw();
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
}

let openingSlide = once(async function () {
    let testEl = document.getElementById("test-pane");
    let infoEl = document.getElementById("info-progress-container");

    let startModal = document.getElementById("start-pane");
    let completeModal = document.getElementById("complete-pane");

    let width = window.innerWidth;

     slideRight([testEl, infoEl, completeModal], width, 0, 1);
    [testEl, infoEl].forEach((el) => el.classList.remove("hidden"));

    await slideLeft(startModal, -width, 0, 500);
    startModal.classList.add("hidden");
    slideLeft([testEl, infoEl], 0, width, 500);

    await openingAnimation(2000, easeInOutCubic);
});

async function onstart() {
    if (speedtestObj.getState() === 3) {
        speedtestObj.abort();
        document.getElementById("start-btn").classList.remove("running");
        document.querySelector("#start-btn .text").innerHTML = "Start";

        updateTestState(testStateObj, true);
        openingAnimation(2000, bounceInEase);

        await sleep(500);

        document.getElementById("test-amount").innerHTML = "0";

        document
            .querySelectorAll(".info-container .unit-container")
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
        openingSlide();
        smoothScroll(
            getOffset(document.getElementById("test-meter")).top -
                window.innerHeight / 2,
            window.scrollY,
            1000
        );
    }
}

async function onend() {
    let buttonEl = document.getElementById("start-btn");
    let testEl = document.getElementById("test-pane");
    let completeModal = document.getElementById("complete-pane");
    let width = window.innerWidth;
    // This doesn't work.
    cancelAnimationFrame(animationLoopHandle);

    await closingAnimation(2000, easeInOutCubic);

    await slideLeft(testEl, -width, 0, 500);
    testEl.classList.add("hidden");
    slideRight(completeModal, 0, -width, 500);
    completeModal.classList.remove("hidden");

    await slideRightWrap(buttonEl, 0, 0, 500, function () {
        document.querySelector("#start-btn .text").innerHTML = "Next →";
    });

    await sleep(2000);

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
    animationLoopInit();
    animationLoopHandle = animationLoopOuter(
        animationLoopUpdate,
        animationLoopDraw
    );
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

    if (testStateObj["upload"] === 3) {
        if (eventObj !== null) {
            console.log("Posting next message.");
            eventObj.source.postMessage("next", eventObj.origin);
        } else {
            document.querySelector(".modal").classList.toggle("visible");
            console.log("Cannot post to null event object. Aborting...");
        }
    } else {
        onstart();
    }
});

addEventListeners(window, "click touchend", function (ev) {
    let modal = document.querySelector(".modal-content");
    if (ev.target == modal || ev.target == modal.parentElement) {
        modal.parentElement.classList.toggle("visible");
    }
});

function receiveMessage(event) {
    if (event.data === "start") {
        eventObj = event;
    }
    console.log(`Received event of ${event}`);
}

window.addEventListener("message", receiveMessage, false);
