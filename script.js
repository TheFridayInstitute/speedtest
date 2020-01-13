import {
    getUrlParams,
    oscillate,
    setGaugeNumbers,
    range,
    toggleOnce,
    normalize,
    clamp,
    lerp,
    Clock,
    easeInBounce,
    bounceInEase
} from "./utils.js";

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

let initGaugeNumbers = function() {
    let gaugeNumbers = range(0, 70, 10);
    let shift = 0;

    setGaugeNumbers(
        document.getElementById("test-meter"),
        gaugeNumbers,
        0,
        shift
    );
};

document.getElementById("start-btn").addEventListener("click", function(e) {
    UI_DATA = startStop();

    toggleOnce(document.getElementById("start-btn"), function() {
        // initGaugeNumbers();
    });
});

// window.addEventListener("resize", function(e) {
//     initGaugeNumbers();
// });

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
                    ip = ip.split("-")[0]; // CHANGE THIS LATER!!
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

function generateGradient(canvas, x0, y0, x1, y1, colorStops) {
    let ctx = canvas.getContext("2d");
    let gradient = ctx.createLinearGradient(x0, y0, x1, y1);

    for (let [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}

function generateGradientWrapper(canvas, colorStops) {
    return generateGradient(canvas, 0, 0, canvas.width, 0, colorStops);
}

function makeGlowColor(value, index) {
    let [stop, color] = value;
    let newColor = new Color(color);
    newColor.setOpacity(0.3);
    return [stop, newColor.colorString];
}

const backgroundColor = "#80808080";
const progressBarColor = "#fff";

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

let dlText = `Download <i class="fa fa-arrow-circle-o-down dl-icon"></i>`;
let ulText = `Upload <i class="fa fa-arrow-circle-o-down ul-icon"></i>`;

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
    let originY = canvas.width / 2;

    let outerRadius = canvas.width / 3;
    let innerRadius = outerRadius / 1.2;

    let alpha0 = Math.PI * 0.8;
    let alpha1 = 2 * Math.PI * 1.1;

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

    let progressGlowColor =
        meterType === "dl"
            ? generateGradientWrapper(canvas, dlColorStops.map(makeGlowColor))
            : generateGradientWrapper(canvas, ulColorStops.map(makeGlowColor));

    ctx.beginPath();
    ctx.strokeStyle = progressGlowColor;
    ctx.lineWidth = lineWidth;

    ctx.arc(originX, originY, innerRadius, alpha0, alpha2, false);

    ctx.shadowBlur = 0;
    ctx.stroke();

    if (typeof progressAmount !== "undefined") {
        ctx.shadowBlur = 0;
        ctx.fillStyle = progressBarColor;

        let barWidth = canvas.width * 0.4;
        let barHeight = 10;

        let x = (canvas.width - barWidth) / 2;
        let y = (canvas.height - barHeight) / 2 + outerRadius;

        ctx.fillRect(x, y, barWidth * progressAmount, barHeight);
        ctx.stroke();
    }
}

function initUI() {
    drawMeter(document.getElementById("test-meter"), 0, 0, "dl");
    document.getElementById("test-amount").innerText = "";
    document.getElementById("ping-amount").innerText = "";
}

function drawGaugeWrapper(
    status,
    gaugeEl,
    gaugeTextEl,
    gaugeAmount,
    gaugeProgress,
    gaugeType
) {
    gaugeAmount = Number(gaugeAmount);
    gaugeProgress = Number(gaugeProgress);

    if (status === 1 && gaugeAmount === 0) {
        gaugeTextEl.innerText = "...";
    } else {
        gaugeTextEl.innerText = gaugeAmount.toPrecision(3);
    }

    drawMeter(
        gaugeEl,
        gaugeAmount * (status == 1 ? oscillate() : 1),
        gaugeProgress,
        gaugeType
    );
}

function updateUI(forced) {
    if (!forced && speedtestObj.getState() != 3) return;

    if (UI_DATA == null) return;

    let status = UI_DATA.testState;

    if (status === 1) {
        document.getElementById("test-kind").innerHTML = dlText;
        drawGaugeWrapper(
            UI_DATA.testState,
            document.getElementById("test-meter"),
            document.getElementById("test-amount"),
            UI_DATA.dlStatus,
            UI_DATA.dlProgress,
            "dl"
        );
    } else if (status == 3) {
        document.getElementById("test-kind").innerHTML = ulText;
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
    }

    document.getElementById("ping-amount").innerText = Math.round(
        UI_DATA.pingStatus
    );
}

function frame() {
    requestAnimationFrame(frame);
    updateUI();
}
frame();

function round(n, d, mode = 0) {
    let ten = Math.pow(10, d);
    let v = 0;
    if (mode === 0) {
        v = Math.round(n * ten);
    } else if (mode === 1) {
        v = Math.ceil(n * ten);
    } else if (mode === 2) {
        v = Math.floor(n * ten);
    }
    return v / ten;
}

function smoothAnimate(to, from, duration, transformFunc, timingFunc) {
    let distance = to - from;

    var clock = new Clock();

    function update() {}

    function draw() {
        let v = round(
            timingFunc(clock.elapsedTicks, from, distance, duration),
            0,
            0
        );

        if (v >= to) {
            transformFunc(to);
            return true;
        }

        transformFunc(v);

        return false;
    }

    function animationLoop() {
        clock.tick();

        let delta = clock.delta;
        let updateSteps = 0;
        let force = false;

        while (delta >= clock.timeStep) {
            delta -= clock.timeStep;
            clock.tick();

            update();
            if (updateSteps++ >= 120) {
                break;
            }
        }
        force = draw();
        if (force || clock.elapsedTicks / duration > 1) {
            return true;
        } else {
            requestAnimationFrame(animationLoop);
        }
    }
    clock.start();
    requestAnimationFrame(animationLoop);
}

function slideRight(el, to, from, duration) {
    duration = duration === undefined ? 1000 : duration;

    let transformFunc = function(v) {
        el.style.transform = `translateX(${v}px)`;
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

function fadeOut(el, duration) {
    duration = duration === undefined ? 1000 : duration;
    let to = 1;
    let from = 0;

    let transformFunc = function(v) {
        el.style.opacity = to - v;
    };

    smoothAnimate(to, from, duration, transformFunc, bounceInEase);
}

window.onload = function() {
    let tmp = this.document.getElementById("tmp");
    let width = window.innerWidth;

    tmp.style.transform = `translateX(${-width}px)`;
    tmp.style.opacity = 0;

    toggleOnce(document.getElementById("ul-amount"), function(e) {
        let tmp = document.getElementById("tmp");
        tmp.style.opacity = 1;
        let width = window.innerWidth;

        let testEl = document.getElementById("test-container");
        let buttonEl = document.getElementById("start-btn");

        slideRight(buttonEl, width, 0);
        slideRight(testEl, width, 0);
        slideRight(tmp, 0, -width);

        setTimeout(function() {
            fadeOut(buttonEl);
            fadeOut(testEl);
        }, 1000);
    });

    setTimeout(function() {
        initUI();
    }, 100);
};
