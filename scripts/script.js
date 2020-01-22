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
    rotateElement,
    createProgessBar,
    animateProgressBar,
    animateProgressBarWrapper,
    debounce,
} from "./animation.js";

import {
    emToPixels,
    getOffset,
    toggleOnce,
    toggle,
    getComputedVariable,
    setAttributes,
} from "./utils.js";

import {Color} from "./colors.js";

window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback, element) {
        setTimeout(callback, 1000 / 60);
    };

var speedtestObj = new Speedtest();
var UI_DATA = null;

var canvasObj;

var meterDial;
var outerMeter;
var innerMeter;
var meterDot;
var progressBarMesh;
var progressIntervals;
var progressBarEl;

var alpha0 = Math.PI * 0.8;
var alpha1 = 2 * Math.PI * 1.1;

var meterMin = 0;
var meterMax = 100;

var lineWidth = emToPixels("2.5em");

var shadowColor = "rgba(0, 0, 0, 0.5)";
var shadowBlur = 0;

var outerRadius;
var innerRadius;

var meterDotSize = 60;

var borderRadiusPrimary = getComputedVariable("--border-radius-primary");

var backgroundColor = getComputedVariable("--meter-background-color");
var progressBarColor = "#fff";
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

var dlText = `<div><i class="fa fa-arrow-circle-o-down"></i></div>`;

let makeGlowColor = function(value, index) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.opacity = 0.2;
    return [stop, newColor.colorString];
};

var speedTestStateMapping = {
    0: "not_started",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted",
};

/**
 * test state object mapping:
 * -1: not started;
 * 0: started;
 * 1: active;
 * 2: finished;
 */

var testStateObj = {ping: -1, download: -1, upload: -1, prev_state: -1};

function updateTestState(speedtestState, testStateObj) {
    let testKind = speedTestStateMapping[speedtestState];
    let prevState = testStateObj["prev_state"];
    let prevKey = speedTestStateMapping[prevState];

    if (testKind === "aborted") {
        for (let [key, value] of Object.entries(testStateObj)) {
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

function setRoundedArcColor(roundedArc, color) {
    roundedArc.map((shape, index) => {
        if (shape instanceof Arc) {
            shape.color = color;
        } else {
            shape.fillColor = color;
        }
    });
}

function startStop() {
    let data = null;
    if (speedtestObj.getState() == 3) {
        speedtestObj.abort();
        data = null;
        document.getElementById("start-btn").classList.remove("running");
        document.getElementById("start-btn").innerText = "Start";
    } else {
        document.getElementById("start-btn").classList.add("running");
        document.getElementById("start-btn").innerText = "Stop";

        speedtestObj.onupdate = function(data) {
            UI_DATA = data;

            if (data.testState === 4) {
                let urlObj = new URL(window.location.href);
                let id = urlObj.searchParams.get("id");
                let ip = String(UI_DATA.clientIp);

                if (id !== undefined) {
                    $.post("backend/record.php", {
                        id: id,
                        dlStatus: data.dlStatus,
                        ulStatus: data.ulStatus,
                        pingStatus: data.pingStatus,
                        jitterStatus: data.jitterStatus,
                        ip: ip,
                    });
                }
            }
        };

        speedtestObj.onend = function(aborted) {
            document.getElementById("start-btn").innerText = "Start";
            document.getElementById("start-btn").classList.remove("running");

            if (aborted) {
                animateProgressBar(
                    progressBarEl,
                    0,
                    parseFloat(progressBarEl.getAttribute("percent-complete")),
                    1000
                );

                if (testStateObj["upload"] > -1) {
                    rotateElement(
                        document.getElementById("test-kind"),
                        0,
                        parseFloat(
                            document
                                .getElementById("test-kind")
                                .getAttribute("rotation")
                        ),
                        1000,
                        false
                    );
                }
            }
            drawFunc();
        };

        speedtestObj.start();
    }
    return UI_DATA;
}

function drawMeterLoop(
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
        meterTextEl.innerHTML = meterAmount.toPrecision(3);
    }

    let t = normalize(
        clamp(meterAmount, meterMin, meterMax),
        meterMin,
        meterMax
    );

    if (t - prevT > eps) {
        t = prevT + eps;
    } else if (t - prevT < -eps) {
        t = prevT - eps;
    }
    prevT = t;

    let theta = lerp(t, alpha0, alpha1);

    outerMeter.draw(canvasObj, 1);
    setRoundedArcColor(outerMeter, progressColor);
    outerMeter.draw(canvasObj, t);
    setRoundedArcColor(outerMeter, backgroundColor);

    setRoundedArcColor(innerMeter, progressGlowColor);
    innerMeter.draw(canvasObj, t);

    meterDot.draw(canvasObj);

    meterDial
        .rotate(theta, true)
        .draw(canvasObj)
        .rotate(-theta, true);

    progressBarMesh.draw(canvasObj, clamp(progressAmount, 0, 1));
}

let openingAnimation = function(duration, timingFunc) {
    let transformFunc = function(v, t) {
        canvasObj.clear();

        outerMeter.radius = outerRadius * t;
        innerMeter.radius = innerRadius * t;

        meterDot.radius = (1 - t) * outerRadius + meterDotSize * t;

        outerMeter.draw(canvasObj, t);
        meterDot.draw(canvasObj, t);

        let theta = lerp(t, alpha0, 4 * Math.PI + alpha0);

        meterDial
            .rotate(theta, true)
            .scale(t)
            .draw(canvasObj)
            .rotate(-theta, true)
            .scale(1 / t);
    };
    smoothAnimate(alpha1, alpha0, duration, transformFunc, timingFunc);
};

let closingAnimation = function(duration, timingFunc) {
    let transformFunc = function(v, t) {
        canvasObj.clear();
        t = clamp(1 - t, 0.0001, 1);

        outerMeter.radius = outerRadius * t;
        meterDot.radius = meterDotSize * t;

        outerMeter.draw(canvasObj, t);
        meterDot.draw(canvasObj, t);

        let theta = lerp(t, alpha0, 4 * Math.PI + alpha0);

        meterDial
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObj)

            .rotate(-theta, true)
            .scale(1 / t);
    };
    smoothAnimate(alpha1, alpha0, duration, transformFunc, timingFunc);
};

let updateFunc = function(t) {
    return false;
};

let drawFunc = function(t) {
    if (speedtestObj.getState() != 3 || UI_DATA === null) {
        return false;
    }

    testStateObj = updateTestState(UI_DATA.testState + 1, testStateObj);

    if (testStateObj["ping"] === 0) {
        document.getElementById("ping-amount").innerText = Math.round(
            UI_DATA.pingStatus
        );

        animateProgressBarWrapper(progressBarEl);
    }
    if (testStateObj["download"] === 1 || testStateObj["download"] === 0) {
        drawMeterLoop(
            UI_DATA.testState,
            document.getElementById("test-amount"),
            UI_DATA.dlStatus,
            UI_DATA.dlProgress,
            dlProgressColor,
            dlProgressGlowColor
        );
    }
    if (testStateObj["upload"] === 0) {
        animateProgressBarWrapper(progressBarEl);
        rotateElement(
            document.getElementById("test-kind"),
            180,
            0,
            1000,
            false
        );

        document.getElementById("dl-amount").innerHTML = Number(
            UI_DATA.dlStatus
        ).toPrecision(3);
    }
    if (testStateObj["upload"] === 1 || testStateObj["upload"] === 0) {
        drawMeterLoop(
            UI_DATA.testState,
            document.getElementById("test-amount"),
            UI_DATA.ulStatus,
            UI_DATA.ulProgress,
            ulProgressColor,
            ulProgressGlowColor
        );
    }
    if (UI_DATA.testState === 4) {
        animateProgressBarWrapper(progressBarEl);

        document.getElementById("ul-amount").innerHTML = Number(
            UI_DATA.ulStatus
        ).toPrecision(3);
        document.getElementById("test-kind").classList.remove("ul");
        onend();
    }
};

var prevT = 0;
var eps = 0.05;

let initFunc = function(t) {
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

    outerMeter = roundedArc(
        0,
        0,
        outerRadius,
        alpha0,
        alpha1,
        backgroundColor,
        lineWidth
    );
    outerMeter.map((shape, index) => {
        shape.shadowColor = shadowColor;
    });

    innerMeter = roundedArc(
        0,
        0,
        innerRadius,
        alpha0,
        alpha1,
        backgroundColor,
        lineWidth
    );
    innerMeter.map((shape, index) => {
        shape.shadowColor = shadowColor;
    });

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

    // Centering the meter meterDial and laying it flat.
    meterDial.translate(-meterDial.centroid[0], 0).rotate(90, false);

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

    progressBarMesh.draw = function(ctx, t) {
        this.shapes[0].draw(ctx, 1);
        this.shapes[1].draw(ctx, t);
    };

    canvasObj = new Canvas(canvas, ctx, [originX, originY]);
};

// NEED TO FIX THE LANDSCAPE SLIDE LEFT BUG!

function onload() {
    let testEl = document.getElementById("test-container");
    let startModal = document.getElementById("start-modal");
    let completeModal = document.getElementById("complete-modal");

    let width = window.innerWidth;
    testEl.style.transform = `translateX(${width}px)`;
    completeModal.style.transform = `translateX(${-width}px)`;

    progressBarEl = document.getElementById("progress-bar");
    createProgessBar(
        progressBarEl,
        [backgroundColorGradient, dlColorGradient, ulColorGradient],
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
}

async function onstart() {
    let duration = 1500;

    toggleOnce(document.getElementById("start-btn"), async function() {
        let testEl = document.getElementById("test-container");
        let startModal = document.getElementById("start-modal");
        let completeModal = document.getElementById("complete-modal");

        testEl.classList.remove("pane-end");

        let width = window.innerWidth;

        slideLeft(startModal, -width, 0);
        slideLeft(testEl, 0, width);

        await sleep(1000);

        startModal.classList.add("pane-end");
        openingAnimation(duration, smoothStep3);
    });

    await sleep(duration);

    let testKind = document.getElementById("test-kind");
    testKind.innerHTML = dlText;

    UI_DATA = startStop();
    animationLoopOuter(updateFunc, drawFunc);
}

async function onend() {
    let duration = 2000;

    closingAnimation(duration, easeInOutCubic);

    let testEl = document.getElementById("test-container");
    let startModal = document.getElementById("start-modal");
    let completeModal = document.getElementById("complete-modal");
    let buttonEl = document.getElementById("start-btn");

    let width = window.innerWidth;

    completeModal.classList.remove("pane-end");

    await sleep(duration);

    slideRight([buttonEl, testEl], width, 0);
    slideRight(completeModal, 0, -width);

    await sleep(1000);

    buttonEl.classList.add("pane-end");
    testEl.classList.add("pane-end");
}

window.onload = function() {
    onload();
    initFunc();
};

document.getElementById("start-btn").addEventListener(
    "click",
    debounce(
        function() {
            onstart();
        },
        1000,
        true
    )
);

// window.addEventListener(
//     "resize",
//     debounce(function() {
//         console.log("RESIZED");
//         onload();
//     }, 500)
// );
