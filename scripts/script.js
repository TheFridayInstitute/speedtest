import {
    Polygon,
    Arc,
    Mesh,
    generateGradientWrapper,
    Rectangle,
    Canvas,
    Text,
    generateRadialGradient,
    generateGradient,
    roundedArc,
    setRoundedArcColor,
    roundedRectangle,
} from "./canvas.js";

import {
    clamp,
    lerp,
    round,
    smoothStep3,
    easeInBounce,
    bounceInEase,
    easeOutQuad,
    normalize,
    easeInOutQuad,
    easeInOutCubic,
    cubicBezier,
    DeCasteljau,
    easeInCubic,
    slerpPoints,
    dot,
    distance,
    rotate,
    range,
    lerpIn,
} from "./math.js";

import {
    smoothAnimate,
    animationLoopOuter,
    slideRight,
    sleep,
    slideLeft,
    smoothRotate,
    createProgressBar,
    animateProgressBar,
    animateProgressBarWrapper,
    debounce,
    throttle,
    rippleButton,
    slideRightWrap,
} from "./animation.js";

import {
    emToPixels,
    getOffset,
    toggleOnce,
    toggle,
    getComputedVariable,
    setAttributes,
    fluidText,
    FSM,
} from "./utils.js";

import { Color } from "./colors.js";

var eventObj = null;
var speedtestObj = null;
var speedtestData = null;

var canvasObj;
var meterDial;
var outerMeter;
var innerMeter;
var meterDot;
var progressBarMesh;
var progressBarEl;

const ALPHA_0 = Math.PI * 0.8;
const ALPHA_1 = 2 * Math.PI * 1.1;

const METER_MIN = 0;
const METER_MAX = 100;

// Keep this constant.
var lineWidth = 32;

var outerRadius;
var innerRadius;
var meterDotSize = 60;

var borderRadiusPrimary = getComputedVariable("--border-radius-primary");

var backgroundColor = getComputedVariable("--meter-background-color");
var progressBarColor = "#fff";
var progressBarGradient = getComputedVariable("--progress-bar-gradient");
var dlColor1 = getComputedVariable("--dl-color-1");
var dlColor2 = getComputedVariable("--dl-color-2");
var ulColor1 = getComputedVariable("--ul-color-1");
var ulColor2 = getComputedVariable("--ul-color-2");

var dlColorGradient = `linear-gradient(to right, ${dlColor1}, ${dlColor2})`;
var ulColorGradient = `linear-gradient(to right, ${ulColor1}, ${ulColor2})`;
var backgroundColorGradient = `linear-gradient(to right, white, ${progressBarColor})`;

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

const STATES = Objects.freeze({
    0: "not_started",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted",
});

function hysteresis(t, prevT, eps = 0.01) {
    if (t - prevT > eps) {
        t = prevT + eps;
    } else if (t - prevT < -eps) {
        t = prevT - eps;
    }
    prevT = t;
    return [t, prevT];
}

let makeGlowColor = function (value, index) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.opacity = 0.3;
    return [stop, newColor.colorString];
};

function receiveMessage(event) {
    if (event.data === "start") {
        eventObj = event;
    }
    console.log(`Received event of ${event}`);
}

window.addEventListener("message", receiveMessage, false);

/**
 * test state object mapping:
 * 0: not started;
 * 1: active;
 * 2: finished;
 */

function startSpeedtest() {
    let data = null;

    // State 3 of the speedtest object == currently running the test.
    if (speedtestObj.getState() === 3) {
        speedtestObj.abort();
        data = null;
        document.getElementById("start-btn").classList.remove("running");
        document.querySelector("#start-btn .text").innerHTML = "Start";
    } else {
        document.getElementById("start-btn").classList.add("running");
        document.querySelector("#start-btn .text").innerHTML = "Stop";
        speedtestObj.start();
    }
    return data;
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
    [t, prevT] = hysteresis(t, prevT, eps);
    let theta = lerp(t, ALPHA_0, ALPHA_1);

    outerMeter.draw(canvasObj, 1);
    setRoundedArcColor(outerMeter, progressColor);
    outerMeter.draw(canvasObj, t);
    setRoundedArcColor(outerMeter, backgroundColor);

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

        let theta = lerp(t, ALPHA_0, 4 * Math.PI + ALPHA_0);

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObj)

            .rotate(-theta, true)
            .scale(1 / t);
    };
    smoothAnimate(ALPHA_1, ALPHA_0, duration, transformFunc, timingFunc);
};

let closingAnimation = function (duration, timingFunc) {
    let transformFunc = function (v, t) {
        canvasObj.clear();
        t = clamp(1 - t, 0.0001, 1);

        outerMeter.radius = outerRadius * t;
        meterDot.radius = meterDotSize * t;

        outerMeter.draw(canvasObj, t);
        meterDot.draw(canvasObj, t);

        let theta = lerp(t, ALPHA_0, 4 * Math.PI + ALPHA_0);

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObj)

            .rotate(-theta, true)
            .scale(1 / t);
    };
    smoothAnimate(ALPHA_1, ALPHA_0, duration, transformFunc, timingFunc);
};

let updateFunc = function (t) {
    return false;
};

let drawFunc = function (t) {
    if (speedtestObj.getState() != 3 || speedtestData === null) {
        return false;
    }

    // testStateObj = updateTestState(speedtestData.testState + 1, testStateObj);

    switch (speedtestData.testState) {
        case STATES.ping:
            break;
        case STATES.download:
            break;
        case STATES.upload:
            break;
        case STATES.finished:
            break;
        default:
            return;
    }

    // If ping complete
    if (false) {
        animateProgressBarWrapper(progressBarEl, 1000, 3);
        document
            .getElementById("ping-amount")
            .parentElement.classList.remove("in-progress");

        document.getElementById("ping-amount").innerText = clamp(
            Math.round(parseFloat(speedtestData.pingStatus)),
            0,
            999
        );
    }

    // If download in progress.
    if (false) {
        drawMeter(
            speedtestData.testState,
            document.getElementById("test-amount"),
            speedtestData.dlStatus,
            speedtestData.dlProgress,
            dlProgressColor,
            dlProgressGlowColor
        );
    }

    // If download complete.
    if (false) {
        animateProgressBarWrapper(progressBarEl, 1000, 3);

        document
            .getElementById("dl-amount")
            .parentElement.classList.remove("in-progress");

        document.getElementById("dl-amount").innerHTML = clamp(
            parseFloat(speedtestData.dlStatus).toPrecision(3),
            0,
            999
        );
    }

    // If upload in progress.
    if (false) {
        drawMeter(
            speedtestData.testState,
            document.getElementById("test-amount"),
            speedtestData.ulStatus,
            speedtestData.ulProgress,
            ulProgressColor,
            ulProgressGlowColor
        );
    }

    // If upload complete.
    if (false) {
        animateProgressBarWrapper(progressBarEl, 1000, 3);
        document
            .getElementById("ul-amount")
            .parentElement.classList.remove("in-progress");

        document.getElementById("ul-amount").innerHTML = clamp(
            parseFloat(speedtestData.ulStatus).toPrecision(3),
            0,
            999
        );

        onend();
    }

    // If test complete.
    if (false) {
    }

    activeStateFSM.update();
};

let initFunc = function (t) {
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
        ALPHA_0,
        ALPHA_1,
        backgroundColor,
        lineWidth
    );

    innerMeter = roundedArc(
        0,
        0,
        innerRadius,
        ALPHA_0,
        ALPHA_1,
        backgroundColor,
        lineWidth
    );

    meterDot = new Arc(
        0,
        0,
        outerRadius / 5,
        0,
        Math.PI * 2,
        backgroundColor,
        1
    );
    meterDot.fillColor = backgroundColor;

    let barWidth = outerRadius;
    let barHeight = lineWidth / 4;

    let progressBar = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        progressBarColor
    );
    let progressBarBackground = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        backgroundColor
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

    if (aborted) {
        openingAnimation(1000, smoothStep3);
        document
            .querySelectorAll(".test-info-container .unit-container")
            .forEach((el) => {
                el.classList.add("in-progress");
            });
        animateProgressBar(
            progressBarEl,
            0,
            parseFloat(progressBarEl.getAttribute("percent-complete")),
            1000
        );
    } else {
        drawFunc();
    }
};

async function onload() {
    // Speed test object init.
    speedtestObj = new Speedtest();
    speedtestObj.setParameter("getIp_ispInfo", false);
    speedtestObj.setParameter("getIp_ispInfo_distance", false);

    speedtestObj.onupdate = speedtestOnUpdate;
    speedtestObj.onend = speedtestOnEnd;

    // Intro sliding animation.
    let testEl = document.getElementById("test-container");
    let startModal = document.getElementById("start-modal");
    let completeModal = document.getElementById("complete-modal");
    let buttonEl = document.getElementById("start-btn");

    let width = window.innerWidth;
    testEl.style.transform = `translateX(${width}px)`;
    completeModal.style.transform = `translateX(${-width}px)`;

    // Creation of progress bar.
    progressBarEl = document.getElementById("progress-bar");
    createProgressBar(
        progressBarEl,
        [progressBarGradient],
        {
            styles: {
                "border-top-left-radius": borderRadiusPrimary,
                "border-bottom-left-radius": borderRadiusPrimary,
            },
        },
        {
            styles: {
                "border-top-right-radius": borderRadiusPrimary,
                "border-bottom-right-radius": borderRadiusPrimary,
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

async function onstart() {
    let duration = 1500;

    toggleOnce(document.getElementById("test-container"), async function () {
        let testEl = document.getElementById("test-container");
        let startModal = document.getElementById("start-modal");
        let completeModal = document.getElementById("complete-modal");

        testEl.classList.remove("pane-hidden");

        let width = window.innerWidth;

        slideLeft(startModal, -width, 0);
        slideLeft(testEl, 0, width);

        await sleep(duration / 2);

        startModal.classList.add("pane-hidden");

        openingAnimation(duration, smoothStep3);
    });

    speedtestData = startSpeedtest();
}

async function onend() {
    let duration = 2000;

    closingAnimation(duration, easeInOutCubic);
    let buttonEl = document.getElementById("start-btn");
    let testEl = document.getElementById("test-container");
    let completeModal = document.getElementById("complete-modal");

    let width = window.innerWidth;

    completeModal.classList.remove("pane-hidden");

    slideRight(testEl, width, 0);
    slideRight(completeModal, 0, -width);

    slideRightWrap(buttonEl, 0, 0, 500, function () {
        document.querySelector("#start-btn .text").innerHTML = "Next →";
    });

    await sleep(duration);

    testEl.classList.add("pane-hidden");

    await sleep(1000);

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
    if (false) {
        if (eventObj !== null) {
            console.log("Posting next message.");
            eventObj.source.postMessage("next", eventObj.origin);
        }
    } else {
        onstart();
    }
});
