import {
    Polygon,
    Arc,
    Mesh,
    generateGradientWrapper,
    Rectangle,
    translate,
    rotate,
    scale,
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
} from "./math.js";

import {
    smoothAnimate,
    animationLoopOuter,
    slideRight,
    sleep,
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

var meterDial;
var outerMeter;
var innerMeter;
var meterDot;

var progressBarMesh;

let alpha0 = Math.PI * 0.8;
let alpha1 = 2 * Math.PI * 1.1;

let meterMin = 0;
let meterMax = 100;

let lineWidth = 60;

let outerRadius = emToPixels(
    getComputedStyle(document.documentElement).getPropertyValue("--meter-width")
);

outerRadius -= (lineWidth * 2) / 2;

let innerRadius = outerRadius / 1.2;

let meterDotSize = 60;

let backgroundColor = "rgba(255, 255, 255, 0.1)";
let progressBarColor = "#fff";

let dlColorStops = [
    ["0", "#8343ab"],
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

let dlText = `Download <i class="fa fa-arrow-circle-o-down dl-icon"></i>`;
let ulText = `Upload <i class="fa fa-arrow-circle-o-down ul-icon" style="transform: rotate(180deg)"></i>`;

let makeGlowColor = function(value, index) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.opacity = 0.3;
    return [stop, newColor.colorString];
};

let slideOverFunc = function() {
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
    canvas,
    meterTextEl,
    meterAmount,
    progressAmount,
    progressColor,
    progressGlowColor
) {
    meterAmount = parseFloat(meterAmount) || 0;
    progressAmount = parseFloat(progressAmount) || 0;

    if (status === 1 && meterAmount === 0) {
        meterTextEl.innerHTML = "";
    } else {
        meterTextEl.innerHTML = meterAmount.toPrecision(3);
    }

    let ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    let t = normalize(
        clamp(meterAmount, meterMin, meterMax),
        meterMin,
        meterMax
    );
    let alpha_t = lerp(t, alpha0, alpha1);

    ctx.shadowBlur = 0;

    outerMeter.color = backgroundColor;
    outerMeter.endAngle = alpha1;
    outerMeter.draw(ctx);

    ctx.shadowBlur = 30;
    ctx.shadowColor = "red";

    outerMeter.color = progressColor;
    outerMeter.endAngle = alpha_t;
    outerMeter.draw(ctx);

    innerMeter.color = progressGlowColor;
    innerMeter.endAngle = alpha_t;
    innerMeter.draw(ctx);

    ctx.shadowBlur = 0;

    meterDot.draw(ctx);

    meterDial
        .translate(-originX, -originY)
        .rotate(alpha_t, true)
        .translate(originX, originY)

        .draw(ctx)

        .translate(-originX, -originY)
        .rotate(-alpha_t, true)
        .translate(originX, originY);

    progressBarMesh.shapes[1].translate(
        -progressBarMesh.shapes[0].originX,
        -progressBarMesh.shapes[0].originY
    );

    progressBarMesh.shapes[1].width =
        progressBarMesh.shapes[0].width * progressAmount;

    progressBarMesh.shapes[1].translate(
        progressBarMesh.shapes[0].originX,
        progressBarMesh.shapes[0].originY
    );

    progressBarMesh.draw(ctx);

    progressBarMesh.shapes[1].translate(
        -progressBarMesh.shapes[0].originX,
        -progressBarMesh.shapes[0].originY
    );

    progressBarMesh.shapes[1].translate(
        progressBarMesh.shapes[0].originX,
        progressBarMesh.shapes[0].originY
    );
}

let initFunc = function(t) {
    let tmp = document.getElementById("tmp");
    let width = window.innerWidth;

    tmp.style.transform = `translateX(${-width}px)`;

    document.getElementById("test-kind").innerHTML = "";
    document.getElementById("test-amount").innerHTML = "0";
    document.getElementById("ping-amount").innerHTML = "0";

    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let canvasOffset = getOffset(canvas);
    let dpr = window.devicePixelRatio || 1;

    canvas.width = canvasOffset.width * dpr;
    canvas.height = canvasOffset.height * dpr;

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

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    let dialBase = lineWidth;
    let dialHeight = innerRadius;
    let dialTop = 20;

    // Initializing polygons

    meterDial = new Polygon(
        [
            [0, 0],
            [dialTop, -dialHeight],
            [dialBase - dialTop, -dialHeight],
            [dialBase, 0],
        ],
        null,
        null,
        "white"
    );
    meterDial.originX = originX - dialBase / 2;
    meterDial.originY = originY;

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

    meterDot = new Arc(originX, originY, 1, 0, Math.PI * 2, backgroundColor, 1);
    meterDot.fillColor = backgroundColor;

    let barWidth = outerRadius;
    let barHeight = lineWidth / 4;

    let progressBarBackground = new Rectangle(
        0,
        0,
        barWidth,
        barHeight,
        backgroundColor
    );
    let progressBarForeground = new Rectangle(
        0,
        0,
        barWidth,
        barHeight,
        progressBarColor
    );

    progressBarMesh = new Mesh(progressBarBackground, progressBarForeground);

    // Centering the meter meterDial and laying it flat.
    meterDial
        .translate(meterDial.originX, meterDial.originY)
        .rotateAboutPoint(originX, originY, 90, false);

    // Centering the progress bar mesh and moving it to be almost outside of the outer radius.
    progressBarMesh
        .translate(originX, originY)
        .translate(
            -progressBarBackground.width / 2,
            -progressBarBackground.height / 2
        )
        .translate(0, outerRadius / 1.5);
};

let openingAnimation = function(duration, timingFunc) {
    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    let transformFunc = function(v, t) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        outerMeter.endAngle = v;
        outerMeter.radius = outerRadius * t;

        innerMeter.endAngle = v;
        innerMeter.radius = innerRadius * t;

        meterDot.radius = (1 - t) * outerRadius + meterDotSize * t;

        outerMeter.draw(ctx);
        meterDot.draw(ctx);

        let theta = lerp(t, alpha0, 4 * Math.PI + alpha0);

        meterDial
            .translate(-originX, -originY)
            .rotate(theta, true)
            .scale(t)
            .translate(originX, originY)

            .draw(ctx)

            .translate(-originX, -originY)
            .rotate(-theta, true)
            .scale(1 / t)
            .translate(originX, originY);
    };

    smoothAnimate(alpha1, alpha0, duration, transformFunc, timingFunc);
};

let closingAnimation = function(duration, timingFunc) {
    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    let transformFunc = function(v, t) {
        t = clamp(1 - t, 0.0001, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        outerMeter.radius = outerRadius * t;

        meterDot.radius = meterDotSize * t;

        outerMeter.draw(ctx);
        meterDot.draw(ctx);

        let theta = lerp(t, alpha0, 4 * Math.PI + alpha0);

        meterDial
            .translate(-originX, -originY)
            .rotate(theta, true)
            .scale(t)
            .translate(originX, originY)

            .draw(ctx)

            .translate(-originX, -originY)
            .rotate(-theta, true)
            .scale(1 / t)
            .translate(originX, originY);
    };

    smoothAnimate(alpha1, alpha0, duration, transformFunc, timingFunc);
};

let rotateDialAnimation = function(duration, timingFunc) {
    let canvas = document.getElementById("test-meter");
    let ctx = canvas.getContext("2d");

    let originX = canvas.width / 2;
    let originY = canvas.height / 2;

    let transformFunc = function(v, t) {
        t = clamp(t, 0.0001, 1);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        outerMeter.draw(ctx);
        meterDot.draw(ctx);

        let theta = lerp(t, alpha0, 4 * Math.PI + alpha0);

        meterDial
            .translate(-originX, -originY)
            .rotate(theta, true)
            .translate(originX, originY)

            .draw(ctx)

            .translate(-originX, -originY)
            .rotate(-theta, true)
            .translate(originX, originY);
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

    switch (UI_DATA.testState) {
        case 1: {
            document.getElementById("test-kind").innerHTML = dlText;
            drawMeterLoop(
                UI_DATA.testState,
                document.getElementById("test-meter"),
                document.getElementById("test-amount"),
                UI_DATA.dlStatus,
                UI_DATA.dlProgress,
                dlProgressColor,
                dlProgressGlowColor
            );
            break;
        }
        case 3: {
            document.getElementById("dl-amount").innerHTML = Number(
                UI_DATA.dlStatus
            ).toPrecision(3);

            document.getElementById("test-kind").innerHTML = ulText;

            drawMeterLoop(
                UI_DATA.testState,
                document.getElementById("test-meter"),
                document.getElementById("test-amount"),
                UI_DATA.ulStatus,
                UI_DATA.ulProgress,
                dlProgressColor,
                dlProgressGlowColor
            );
            break;
        }
        case 4: {
            document.getElementById("ul-amount").innerHTML = Number(
                UI_DATA.ulStatus
            ).toPrecision(3);

            setTimeout(function() {
                let duration = 3000;
                closingAnimation(duration, easeInOutCubic);

                setTimeout(function() {
                    slideOverFunc();
                }, duration * 0.75);
            }, 1000);

            break;
        }
    }

    document.getElementById("ping-amount").innerText = Math.round(
        UI_DATA.pingStatus
    );

    return false;
};

window.onload = function() {
    document.getElementById("test-kind").innerHTML = dlText;
    animationLoopOuter(initFunc, updateFunc, drawFunc);
};

document.getElementById("start-btn").addEventListener("click", function(e) {
    let duration = 3000;
    // toggle(
    //     document.getElementById("start-btn"),
    //     function() {
    //         openingAnimation(duration, smoothStep3);
    //     },
    //     function() {
    //         closingAnimation(duration, easeInOutCubic);
    //     }
    // );
    openingAnimation(duration, smoothStep3);
    setTimeout(function() {
        UI_DATA = startStop();
    }, duration);
});
