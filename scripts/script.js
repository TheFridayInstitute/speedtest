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
} from "./math.js";

import {
    smoothAnimate,
    animationLoopOuter,
    slideRight,
    sleep,
    slideLeft,
} from "./animation.js";

import {
    emToPixels,
    getOffset,
    toggleOnce,
    getUrlParams,
    toggle,
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

let alpha0 = Math.PI * 0.8;
let alpha1 = 2 * Math.PI * 1.1;

let meterMin = 0;
let meterMax = 100;

let lineWidth = emToPixels("2.5em");

let shadowColor = "rgba(0, 0, 0, 0.5)";
let shadowBlur = 0;

var outerRadius;
var innerRadius;

var meterDotSize = 60;

let backgroundColor = "rgba(0, 0, 0, 0.25)";
let progressBarColor = "#fff";

let dlColorStops = [
    ["0", "#8630e6"],
    ["0.5", "#d359ff"],
    ["1.0", "#f71e6a"],
];

let ulColorStops = [
    ["0", "#FF8000"],
    ["0.5", "#FF8000"],
    ["1.0", "#FF0000"],
];

var dlProgressColor;
var dlProgressGlowColor;

var ulProgressColor;
var ulProgressGlowColor;

let dlText = `<div class="dl-icon"><i class="fa fa-arrow-circle-o-down"></i></div>`;
let ulText = `<div class="ul-icon"><i class="fa fa-arrow-circle-o-down"></i></div>`;

let makeGlowColor = function(value, index) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.opacity = 0.2;
    return [stop, newColor.colorString];
};

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

            let urlParams = getUrlParams(window.location.href);

            if (data.testState === 4) {
                let ip = String(UI_DATA.clientIp);
                if (ip.length < 100 && ip.length > 0) {
                    ip = ip.split("-")[0].trim(); // CHANGE THIS LATER!!
                }

                $.post("backend/record.php", {
                    id: urlParams.id || -1,
                    dlStatus: data.dlStatus,
                    ulStatus: data.ulStatus,
                    pingStatus: data.pingStatus,
                    jitterStatus: data.jitterStatus,
                    ip: ip,
                    date: Date.now(),
                });
            }
        };

        speedtestObj.onend = function(aborted) {
            document.getElementById("start-btn").innerText = "Start";
            document.getElementById("start-btn").classList.remove("running");
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
    let theta = lerp(t, alpha0, alpha1);

    outerMeter.draw(canvasObj, 1);
    outerMeter.map((shape, index) => {
        if (shape instanceof Arc) {
            shape.color = progressColor;
            shape.shadowColor = shadowColor;
            shape.shadowBlur = shadowBlur;
        } else {
            shape.fillColor = progressColor;
        }
    });

    outerMeter.draw(canvasObj, t);
    outerMeter.map((shape, index) => {
        shape.shadowBlur = 0;
        if (shape instanceof Arc) {
            shape.color = backgroundColor;
        } else {
            shape.fillColor = backgroundColor;
        }
    });

    innerMeter.map((shape, index) => {
        if (shape instanceof Arc) {
            shape.shadowColor = shadowColor;
            shape.shadowBlur = shadowBlur;
            shape.color = progressGlowColor;
        } else {
            shape.fillColor = progressGlowColor;
        }
    });
    innerMeter.draw(canvasObj, t);

    meterDot.draw(canvasObj);

    meterDial
        .rotate(theta, true)
        .draw(canvasObj)
        .rotate(-theta, true);

    progressBarMesh.draw(canvasObj, progressAmount);
}

let initFunc = function(t) {
    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let canvasOffset = getOffset(canvas);
    let dpr = window.devicePixelRatio || 1;
    lineWidth *= dpr;

    canvas.width = canvasOffset.width * dpr;
    canvas.height = canvasOffset.height * dpr;
    let innerDelta = lineWidth * 1.25;

    outerRadius = canvas.width / 2 - lineWidth / 2;
    innerRadius = outerRadius - innerDelta;

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    dlProgressColor = generateGradient(
        ctx,
        dlColorStops,
        originX - outerRadius,
        originY + outerRadius,
        originX + outerRadius,
        originY + outerRadius
    );

    ulProgressColor = generateGradient(
        ctx,
        ulColorStops,
        originX - outerRadius,
        originY + outerRadius,
        originX + outerRadius,
        originY + outerRadius
    );

    dlProgressGlowColor = generateGradient(
        ctx,
        dlColorStops.map(makeGlowColor),
        originX - innerRadius,
        originY + innerRadius,
        originX + innerRadius,
        originY + innerRadius
    );

    ulProgressGlowColor = generateGradient(
        ctx,
        ulColorStops.map(makeGlowColor),
        originX - innerRadius,
        originY + innerRadius,
        originX + innerRadius,
        originY + innerRadius
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

    if (UI_DATA.testState === 1) {
        document.getElementById("test-kind").innerHTML = dlText;
        drawMeterLoop(
            UI_DATA.testState,
            document.getElementById("test-amount"),
            UI_DATA.dlStatus,
            UI_DATA.dlProgress,
            dlProgressColor,
            dlProgressGlowColor
        );
    } else if (UI_DATA.testState === 3) {
        document.getElementById("dl-amount").innerHTML = Number(
            UI_DATA.dlStatus
        ).toPrecision(3);

        document.getElementById("test-kind").innerHTML = ulText;
        drawMeterLoop(
            UI_DATA.testState,
            document.getElementById("test-amount"),
            UI_DATA.ulStatus,
            UI_DATA.ulProgress,
            ulProgressColor,
            ulProgressGlowColor
        );
    } else if (UI_DATA.testState === 4) {
        document.getElementById("ul-amount").innerHTML = Number(
            UI_DATA.ulStatus
        ).toPrecision(3);

        setTimeout(function() {
            onend();
        }, 1000);
    }

    document.getElementById("ping-amount").innerText = Math.round(
        UI_DATA.pingStatus
    );

    return false;
};

function onload() {
    let testEl = document.getElementById("test-container");
    let startModal = document.getElementById("start-modal");
    let completeModal = document.getElementById("complete-modal");

    let width = window.innerWidth;
    testEl.style.transform = `translateX(${width}px)`;
    completeModal.style.transform = `translateX(${-width}px)`;

    document.getElementById("test-kind").innerHTML = dlText;
    document.getElementById("test-amount").innerHTML = "0";
    document.getElementById("ping-amount").innerHTML = "0";

    animationLoopOuter(initFunc, updateFunc, drawFunc);
}

async function onstart() {
    let duration = 1000;

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
    UI_DATA = startStop();
}

async function onend() {
    let duration = 3000;
    closingAnimation(duration, easeInOutCubic);

    let testEl = document.getElementById("test-container");
    let startModal = document.getElementById("start-modal");
    let completeModal = document.getElementById("complete-modal");
    let buttonEl = document.getElementById("start-btn");

    let width = window.innerWidth;

    completeModal.classList.remove("pane-end");

    await sleep(duration);

    slideRight(buttonEl, width, 0);
    slideRight(testEl, width, 0);
    slideRight(completeModal, 0, -width);

    await sleep(1000);

    buttonEl.classList.add("pane-end");
    testEl.classList.add("pane-end");
}

window.onload = function() {
    onload();
};

document.getElementById("start-btn").addEventListener("click", function(e) {
    onstart();
});
