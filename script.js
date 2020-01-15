import { Polygon, Arc, Mesh } from "./canvas.js";

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
    easeInOutCubic
} from "./math.js";

import { smoothAnimate, animationLoopOuter } from "./animation.js";

import { emToPixels, getOffset } from "./utils.js";

import { Color } from "./colors.js";

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

var dial;
var outerMeter;
var innerMeter;
var centerDot;
var mesh;

let alpha0 = Math.PI * 0.8;
let alpha1 = 2 * Math.PI * 1.1;

let mobileScale = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue(
        "--mobile-scale"
    )
);

let outerRadius =
    emToPixels(
        getComputedStyle(document.documentElement).getPropertyValue(
            "--meter-outer-radius"
        )
    ) / mobileScale;

let innerRadius = outerRadius / 1.2;

let lineWidth = 60;

let dotSize = 20;

let backgroundColor = "rgba(255, 255, 255, 0.1)";
let progressBarColor = "#fff";

let dlColorStops = [
    ["0", "#8343ab"],
    ["0.5", "#d359ff"],
    ["1.0", "#f71e6a"]
];

let ulColorStops = [
    ["0", "#FF8000"],
    ["0.5", "#FF8000"],
    ["1.0", "#FF0000"]
];

let dots = `<div
class="container-fluid d-flex justify-content-center center filter-contrast">
<div class="dot-overtaking"></div></div>`;

let dlText = `Download <i class="fa fa-arrow-circle-o-down dl-icon"></i>`;
let ulText = `Upload <i class="fa fa-arrow-circle-o-down ul-icon"></i>`;

let initMeterNumbers = function(start, stop, step) {
    let numbers = range(start, stop, step);

    let meterEl = document.getElementById("test-container");
    let numbersEl = document.createElement("div");
    numbersEl.classList.add("meter-numbers");
    numbersEl.id = "meter-numbers";

    for (let number of numbers) {
        let child = document.createElement("div");
        child.innerHTML = number;
        numbersEl.appendChild(child);
    }
    meterEl.appendChild(numbersEl);
};

let resizeMeterNumbers = function(delay) {
    let meterEl = document.getElementById("test-container");
    let numbersEl = document.querySelector("#meter-numbers");
    let testMeter = document.getElementById("test-meter");
    let meterOffset = getOffset(testMeter);
    let innerRadius = outerRadius / 2.5 / mobileScale;

    let originX = meterOffset.width / 2;
    let originY = meterOffset.height / 2;

    setMeterNumbers(
        meterEl,
        numbersEl,
        innerRadius,
        alpha0,
        alpha1,
        originX,
        originY,
        delay
    );
};

let makeGlowColor = function(value, index) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.setOpacity(0.3);
    return [stop, newColor.colorString];
};

function startStop() {
    let data = null;
    if (speedtestObj.getState() == 3) {
        speedtestObj.abort();
        data = null;
        document.getElementById("start-btn").classList.remove("running");
        document.getElementById("start-btn").innerText = "Start";

        initUI();
    } else {
        document.getElementById("start-btn").classList.add("running");
        document.getElementById("start-btn").innerText = "Stop";
        speedtestObj.onupdate = function(data) {
            UI_DATA = data;

            let urlParams = getUrlParams(window.location.href);

            if (data.testState === 4) {
                let clientData = {};

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
                    ip: ip
                });
            }
        };

        speedtestObj.onend = function(aborted) {
            document.getElementById("start-btn").innerText = "Start";
            document.getElementById("start-btn").classList.remove("running");
            updateUI(true);
        };

        speedtestObj.start();
    }
    return UI_DATA;
}

function drawMeter(canvas, amount, progressAmount, meterType) {
    let ctx = canvas.getContext("2d");

    let dp = window.devicePixelRatio || 1;
    let cw = canvas.clientWidth * dp;
    let ch = canvas.clientHeight * dp;

    if (canvas.width == cw && canvas.height == ch) {
        ctx.clearRect(0, 0, cw, ch);
    } else {
        canvas.width = cw;
        canvas.height = ch;
    }

    let lineWidth = 60;

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    ctx.beginPath();
    ctx.strokeStyle = backgroundColor;
    ctx.lineWidth = lineWidth;

    ctx.arc(originX, originY, outerRadius, alpha0, alpha1);

    ctx.shadowBlur = 20;
    ctx.shadowColor = "black";

    ctx.stroke();

    let progressColor =
        meterType === "dl"
            ? generateGradientWrapper(canvas, dlColorStops)
            : generateGradientWrapper(canvas, ulColorStops);

    ctx.beginPath();
    ctx.strokeStyle = progressColor;
    ctx.lineWidth = lineWidth;

    let min = 0;
    let max = 100;

    let t = normalize(amount, min, max);
    let alpha2 = clamp(lerp(alpha0, alpha1, t), alpha0, alpha1);

    ctx.arc(originX, originY, outerRadius, alpha0, alpha2);
    ctx.shadowBlur = 20;
    ctx.shadowColor = "red";
    ctx.stroke();

    let innerRadius = outerRadius / 1.2;

    let progressGlowColor =
        meterType === "dl"
            ? generateGradientWrapper(canvas, dlColorStops.map(makeGlowColor))
            : generateGradientWrapper(canvas, ulColorStops.map(makeGlowColor));

    ctx.beginPath();
    ctx.strokeStyle = progressGlowColor;
    ctx.lineWidth = lineWidth;
    ctx.arc(originX, originY, innerRadius, alpha0, alpha2, false);
    ctx.stroke();

    ctx.shadowBlur = 0;

    let barWidth = outerRadius * 1.5;
    let barHeight = lineWidth / 4;

    let x = (canvas.width - barWidth) / 2;
    let y = (canvas.height - barHeight) / 2 + outerRadius;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.stroke();

    if (typeof progressAmount !== "undefined") {
        ctx.shadowBlur = 0;
        ctx.fillStyle = progressBarColor;

        ctx.fillRect(x, y, barWidth * progressAmount, barHeight);
        ctx.stroke();
    }
}

function initUI() {
    document.getElementById("test-kind").innerHTML = "Speedtest";
    document.getElementById("test-amount").innerHTML = dots;
    document.getElementById("ping-amount").innerHTML = "0";
}

function drawGaugeWrapper(
    status,
    gaugeEl,
    gaugeTextEl,
    gaugeAmount,
    gaugeProgress,
    gaugeType
) {
    gaugeAmount = parseFloat(gaugeAmount);
    gaugeProgress = parseFloat(gaugeProgress);

    gaugeAmount = gaugeAmount === undefined ? 0 : gaugeAmount;
    gaugeProgress = gaugeProgress === undefined ? 0 : gaugeProgress;

    if (status === 1 && gaugeAmount === 0) {
        gaugeTextEl.innerHTML = dots;
    } else {
        gaugeTextEl.innerHTML = gaugeAmount.toPrecision(3);
    }

    drawMeter(gaugeEl, gaugeAmount, gaugeProgress, gaugeType);
}

function updateUI(forced) {
    if (!forced && speedtestObj.getState() != 3) return;

    if (UI_DATA == null) return;

    let status = UI_DATA.testState;
    let testKindEl = document.getElementById("test-kind");

    if (status === 1) {
        testKindEl.innerHTML = dlText;

        drawGaugeWrapper(
            UI_DATA.testState,
            document.getElementById("test-meter"),
            document.getElementById("test-amount"),
            UI_DATA.dlStatus,
            UI_DATA.dlProgress,
            "dl"
        );
    } else if (status == 3) {
        testKindEl.innerHTML = ulText;

        document.getElementById("dl-amount").innerHTML = Number(
            UI_DATA.dlStatus
        ).toPrecision(3);

        drawGaugeWrapper(
            UI_DATA.testState,
            document.getElementById("test-meter"),
            document.getElementById("test-amount"),
            UI_DATA.ulStatus,
            UI_DATA.ulProgress,
            "ul"
        );
    } else if (status === 4) {
        document.getElementById("ul-amount").innerHTML = Number(
            UI_DATA.ulStatus
        ).toPrecision(3);

        toggleOnce(document.getElementById("ul-amount"), function(e) {
            let tmp = document.getElementById("tmp");

            tmp.style.opacity = "1";

            let width = window.innerWidth;

            let testEl = document.getElementById("test-container");
            let buttonEl = document.getElementById("start-btn");

            slideRight(buttonEl, width, 0);
            slideRight(testEl, width, 0);
            slideRight(tmp, 0, -width);

            setTimeout(function() {
                buttonEl.style.opacity = 0;
                testEl.style.opacity = 0;
            }, 1000);
        });
    }

    document.getElementById("ping-amount").innerText = Math.round(
        UI_DATA.pingStatus
    );
}

let initFunc = function(t) {
    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let canvasOffset = getOffset(canvas);
    let dpr = window.devicePixelRatio || 1;

    canvas.width = canvasOffset.width * dpr;
    canvas.height = canvasOffset.height * dpr;

    let originX = canvas.width / 2;
    let originY = canvas.width / 2;

    let dialBase = 10;
    let dialHeight = innerRadius;

    // Initializing polygons

    dial = new Polygon(
        [
            [0, 0],
            [dialBase, -dialHeight],
            [2 * dialBase, 0]
        ],
        "red"
    );

    outerMeter = new Arc(
        originX,
        originY,
        outerRadius,
        alpha0,
        0,
        backgroundColor,
        lineWidth
    );

    innerMeter = new Arc(
        originX,
        originY,
        innerRadius,
        alpha0,
        0,
        backgroundColor,
        lineWidth
    );

    centerDot = new Arc(
        originX,
        originY,
        1,
        0,
        Math.PI * 2,
        backgroundColor,
        1
    );

    centerDot.fillColor = backgroundColor;

    // Centering the meter dial and laying it flat.
    dial.translate(originX, originY)
        .translate(-dialBase / 2, 0)
        .rotateAboutPoint(originX, originY, 90, false)
        .draw(ctx);

    let transformFunc = function(v, t) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        outerMeter.endAngle = v;
        outerMeter.radius = outerRadius * t;

        innerMeter.endAngle = v;
        innerMeter.radius = innerRadius * t;

        centerDot.radius = (1 - t) * outerRadius + dotSize * t;

        outerMeter.draw(ctx);
        centerDot.draw(ctx);

        dial.translate(-originX, -originY)
            .rotate(v, true)
            .scale(t)
            .translate(originX, originY)

            .draw(ctx)

            .translate(-originX, -originY)
            .rotate(-v, true)
            .scale(1 / t)
            .translate(originX, originY);
    };

    smoothAnimate(alpha1, alpha0, 2000, transformFunc, easeInOutCubic);
};

let updateFunc = function(t) {
    return false;
};
let drawFunc = function(t) {
    updateUI();
    return false;
};

window.onload = function() {
    let tmp = document.getElementById("tmp");
    let width = window.innerWidth;

    tmp.style.transform = `translateX(${-width}px)`;

    initUI();

    animationLoopOuter(initFunc, updateFunc, drawFunc);
};

document.getElementById("start-btn").addEventListener("click", function(e) {
    UI_DATA = startStop();

    toggleOnce(document.getElementById("start-btn"), function() {
        // meterInit(document.getElementById("test-meter"), 2000);
        // setTimeout(function() {
        //     initMeterNumbers(0, 100, 25);
        //     resizeMeterNumbers(100);
        // }, 500);
    });
});

// window.matchMedia("(max-width: 768px)").addListener(function() {
//     resizeMeterNumbers(0);
// });
