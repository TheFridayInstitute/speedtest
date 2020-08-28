var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Polygon, Arc, Mesh, Canvas, roundedArc, setRoundedArcColor, roundedRectangle, generateGradient } from "./canvas.js";
import { clamp, lerp, normalize, easeInOutCubic, slerpPoints, easeOutCubic, easeInCubic } from "./math.js";
import { smoothAnimate, animationLoopOuter, sleep, createProgressBar, animateProgressBarWrapper, animateProgressBar, rippleButton, throttle } from "./animation.js";
import { getOffset, once, getComputedVariable, emToPixels } from "./utils.js";
import { Color } from "./colors.js";
import { $, $$ } from "./dollar.js";
// Global speedtest and event state variables.
let eventObject;
let speedtestObject;
let speedtestData;
// Global state variables for the canvas
let canvasObject;
var TestState;
(function (TestState) {
    TestState[TestState["notStarted"] = 0] = "notStarted";
    TestState[TestState["started"] = 1] = "started";
    TestState[TestState["active"] = 2] = "active";
    TestState[TestState["finished"] = 3] = "finished";
    TestState[TestState["drawFinished"] = 4] = "drawFinished";
})(TestState || (TestState = {}));
var SpeedtestState;
(function (SpeedtestState) {
    SpeedtestState[SpeedtestState["notStarted"] = 0] = "notStarted";
    SpeedtestState[SpeedtestState["started"] = 1] = "started";
    SpeedtestState[SpeedtestState["download"] = 2] = "download";
    SpeedtestState[SpeedtestState["ping"] = 3] = "ping";
    SpeedtestState[SpeedtestState["upload"] = 4] = "upload";
    SpeedtestState[SpeedtestState["finished"] = 5] = "finished";
    SpeedtestState[SpeedtestState["aborted"] = 6] = "aborted";
})(SpeedtestState || (SpeedtestState = {}));
const SPEEDTEST_STATE_MAP = Object.freeze({
    0: "notStarted",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted"
});
const SPEEDTEST_DATA_MAP = Object.freeze({
    pingAmount: "pingStatus",
    downloadAmount: "dlStatus",
    uploadAmount: "ulStatus",
    pingProgress: "pingProgress",
    downloadProgress: "dlProgress",
    uploadProgress: "ulProgress"
});
const testStateObject = {
    ping: TestState.notStarted,
    download: TestState.notStarted,
    upload: TestState.notStarted,
    prevState: SpeedtestState.notStarted
};
let meterObject = {
    startAngle: Math.PI * 0.8,
    endAngle: 2 * Math.PI * 1.1,
    minValue: 0,
    maxValue: 100,
    lineWidth: 2 * emToPixels(getComputedVariable("font-size")),
    backgroundColor: getComputedVariable("--meter-background-color")
};
let progressBarObject = {
    color: "#fff",
    backgroundColor: meterObject.backgroundColor
};
const DOTS = `<div class="dot-container"><div class="dot-typing"></div></div>`;
const BLANK = "&nbsp;";
const BORDER_RADIUS_PRIMARY = getComputedVariable("--border-radius-primary");
const PROGRESS_BAR_GRADIENT = getComputedVariable("--progress-bar-gradient");
const WINDOW_KEY = "password";
const receiveMessage = function (event) {
    const data = event.data;
    if (data.key === WINDOW_KEY) {
        eventObject = event;
        console.log(`Received event data of ${data}`);
        if (data.message === "start") {
            onstart();
        }
    }
    else {
        console.warn("Event data not accepted.");
    }
};
const postMessage = function (eventObject, windowMessage) {
    return new Promise((resolve, reject) => {
        if (eventObject != null) {
            console.log(`Posting event message of ${windowMessage.message}`);
            // @ts-expect-error
            eventObject.source.postMessage(windowMessage, eventObject.origin);
            resolve(windowMessage);
        }
        else {
            reject(new Error("The given event object was null."));
        }
    });
};
const awaitHidden = function () {
    return __awaiter(this, void 0, void 0, function* () {
        while (document.hidden) {
            yield sleep(10);
        }
    });
};
const generateColorStops = function (colorName, step = 0.5) {
    const stops = Math.floor(1 / step) + 1;
    return Array(stops)
        .fill(0)
        .map(function (_, index) {
        const stop = index * step;
        const tmpColorName = `--${colorName}-${index}`;
        const color = getComputedVariable(tmpColorName);
        return [stop, color];
    });
};
const generateInnerColorStops = function (value) {
    const [stop, color] = value;
    const newColor = new Color(color);
    newColor.opacity = 0.3;
    return [stop, newColor.colorString];
};
const hysteresisRecord = {};
const hysteresis = function (t, key, eps = 0.01, step = 1 / 15) {
    const prevT = hysteresisRecord[key] || 0;
    const delta = Math.abs(t - prevT);
    if (delta > eps) {
        t = lerp(step, prevT, t);
    }
    hysteresisRecord[key] = t;
    return t;
};
const animateProgressBarEl = function () {
    //@ts-expect-error
    animateProgressBarWrapper($("#progress-bar"), 1000, 3);
};
const openingAnimation = function (duration, timingFunc) {
    return __awaiter(this, void 0, void 0, function* () {
        const { dot, outerMeter, dial } = meterObject;
        const transformFunc = function (v, t) {
            canvasObject.clear();
            outerMeter.mesh.draw(canvasObject, t);
            dot.mesh.draw(canvasObject, t);
            const theta = lerp(t, meterObject.startAngle, meterObject.startAngle + 2 * Math.PI);
            dial.mesh
                .rotate(theta, true)
                .scale(1)
                .draw(canvasObject)
                .rotate(-theta, true)
                .scale(1);
            progressBarObject.mesh.draw(canvasObject, 0);
            return false;
        };
        yield smoothAnimate(meterObject.endAngle, meterObject.startAngle, duration, transformFunc, timingFunc);
    });
};
const closingAnimation = function (duration, timingFunc) {
    return __awaiter(this, void 0, void 0, function* () {
        const { dot, outerMeter, dial } = meterObject;
        const transformFunc = function (v, t) {
            canvasObject.clear();
            t = clamp(1 - t, 0.0001, 1);
            outerMeter.mesh.draw(canvasObject, t);
            dot.mesh.draw(canvasObject, t);
            const theta = lerp(t, meterObject.startAngle, 4 * Math.PI + meterObject.startAngle);
            dial.mesh
                .rotate(theta, true)
                .scale(t)
                .draw(canvasObject)
                .rotate(-theta, true)
                .scale(1 / t);
            progressBarObject.mesh.draw(canvasObject, t);
            return false;
        };
        yield smoothAnimate(meterObject.endAngle, meterObject.startAngle, duration, transformFunc, timingFunc);
    });
};
const drawMeter = function (stateName) {
    const { dot, outerMeter, innerMeter, dial, backgroundColor } = meterObject;
    let outerMeterColor = backgroundColor;
    let innerMeterColor = backgroundColor;
    if (stateName === "download") {
        outerMeterColor = outerMeter.dlColor;
        innerMeterColor = innerMeter.dlColor;
    }
    else if (stateName === "upload") {
        outerMeterColor = outerMeter.ulColor;
        innerMeterColor = innerMeter.ulColor;
    }
    if (!stateName) {
        setRoundedArcColor(outerMeter.mesh, backgroundColor);
        outerMeter.mesh.draw(canvasObject, 1);
        dot.mesh.draw(canvasObject);
        dial.mesh
            .rotate(meterObject.startAngle, true)
            .draw(canvasObject)
            .rotate(-meterObject.startAngle, true);
    }
    else {
        const stateAmount = getSpeedtestStateAmount(stateName);
        let t = normalize(clamp(stateAmount, meterObject.minValue, meterObject.maxValue), meterObject.minValue, meterObject.maxValue);
        t = hysteresis(t, "meter");
        const theta = lerp(t, meterObject.startAngle, meterObject.endAngle);
        setRoundedArcColor(outerMeter.mesh, backgroundColor);
        outerMeter.mesh.draw(canvasObject, 1);
        // Draw the meter twice here to avoid the weird aliasing
        // issue around the rounded end caps thereof.
        setRoundedArcColor(outerMeter.mesh, outerMeterColor);
        outerMeter.mesh.draw(canvasObject, t);
        outerMeter.mesh.draw(canvasObject, t);
        setRoundedArcColor(outerMeter.mesh, backgroundColor);
        setRoundedArcColor(innerMeter.mesh, innerMeterColor);
        innerMeter.mesh.draw(canvasObject, t);
        dot.mesh.draw(canvasObject);
        dial.mesh.rotate(theta, true).draw(canvasObject).rotate(-theta, true);
    }
};
const drawMeterProgressBar = function (stateName) {
    if (stateName == null) {
        progressBarObject.mesh.draw(canvasObject, 0);
    }
    else {
        const stateAmount = getSpeedtestStateAmount(stateName, "Progress");
        let t = clamp(stateAmount, 0, 1);
        t = hysteresis(t, "progressBar");
        progressBarObject.mesh.draw(canvasObject, t);
    }
};
const getSpeedtestStateAmount = function (stateName, stateKind = "Amount") {
    if (speedtestData == null) {
        return undefined;
    }
    else {
        const key = stateName + stateKind;
        const stateAmount = parseFloat(speedtestData[SPEEDTEST_DATA_MAP[key]]);
        const upperBound = stateKind === "Amount" ? 99999 : 1;
        return Number.isNaN(stateAmount) ? 0 : clamp(stateAmount, 0, upperBound);
    }
};
const getSpeedtestStateName = function () {
    if (speedtestData == null) {
        return undefined;
    }
    else {
        return SPEEDTEST_STATE_MAP[speedtestData.testState + 1];
    }
};
const getStateUnitInfo = function (stateName, stateAmount) {
    stateAmount = stateAmount !== null && stateAmount !== void 0 ? stateAmount : getSpeedtestStateAmount(stateName);
    const unitInfo = {};
    if (stateName === "download" || stateName === "upload") {
        if (stateAmount < 1000) {
            unitInfo["unit"] = "Mbps";
        }
        else if (stateAmount >= 1000) {
            unitInfo["unit"] = "Gbps";
            stateAmount /= 1000;
        }
        unitInfo["amount"] = stateAmount.toPrecision(3);
    }
    else if (stateName === "ping") {
        if (stateAmount < 1000) {
            unitInfo["unit"] = "ms";
        }
        else if (stateAmount >= 1000) {
            unitInfo["unit"] = "s";
            stateAmount /= 1000;
        }
        unitInfo["amount"] = stateAmount.toPrecision(3);
    }
    return unitInfo;
};
const setUnitElementInfo = function (info, unitInfoElement) {
    Object.keys(info).forEach((key) => {
        $(`.${key}`, unitInfoElement).innerHTML = info[key];
    });
};
const updateTestStateInfo = function (stateName) {
    if (["ping", "download", "upload"].indexOf(stateName) === -1) {
        return;
    }
    const unitContainerElement = $(`#${stateName} .unit-container`);
    const testState = testStateObject[stateName];
    if (testState === TestState.started) {
        $(".amount", unitContainerElement).innerHTML = DOTS;
    }
    else if (testState === TestState.active) {
        const meterUnitInfoElement = $(".speedtest-container .info-container");
        let unitInfo = getStateUnitInfo(stateName);
        if (stateName === "ping") {
            unitInfo = Object.assign(Object.assign({}, unitInfo), { footer: "Latency" });
            setUnitElementInfo(unitInfo, meterUnitInfoElement);
        }
        else if (stateName === "download") {
            unitInfo = Object.assign(Object.assign({}, unitInfo), { kind: "↓", footer: "Download" });
            setUnitElementInfo(unitInfo, meterUnitInfoElement);
        }
        else if (stateName === "upload") {
            unitInfo = Object.assign(Object.assign({}, unitInfo), { kind: "↑", footer: "Upload" });
            setUnitElementInfo(unitInfo, meterUnitInfoElement);
        }
    }
    else if (testState === TestState.finished) {
        const unitInfo = getStateUnitInfo(stateName);
        animateProgressBarEl();
        unitContainerElement.classList.remove("in-progress");
        setUnitElementInfo(unitInfo, unitContainerElement);
        testStateObject[stateName] = TestState.drawFinished;
    }
};
const updateTestState = function (abort = false) {
    const testState = speedtestData.testState + 1;
    const testStateName = SPEEDTEST_STATE_MAP[testState];
    const prevTestStateName = SPEEDTEST_STATE_MAP[testStateObject.prevState];
    if (abort) {
        Object.keys(testStateObject).forEach((key) => {
            testStateObject[key] = TestState.notStarted;
        });
    }
    else {
        if (testStateObject.prevState != SpeedtestState.notStarted &&
            testState !== testStateObject.prevState) {
            testStateObject[testStateName] = TestState.started;
            testStateObject[prevTestStateName] = TestState.finished;
            updateTestStateInfo(prevTestStateName);
        }
        else {
            testStateObject[testStateName] = TestState.active;
        }
        testStateObject.prevState = testState;
        updateTestStateInfo(testStateName);
    }
};
const animationLoopOnupdate = function () {
    if (speedtestData == null || speedtestObject.getState() < 3) {
        return false;
    }
    updateTestState();
};
const animationLoopOndraw = function () {
    if (speedtestData == null || speedtestObject.getState() < 3) {
        return false;
    }
    const stateName = getSpeedtestStateName();
    if (stateName === "ping" || stateName === "download" || stateName === "upload") {
        // We need to clear the canvas here,
        // else we'll get a strange flashing
        // due to the canvas clearing faster than
        // we can draw.
        canvasObject.clear();
        drawMeter(stateName);
        drawMeterProgressBar(stateName);
    }
    return false;
};
const animationLoopOnload = function () {
    // Cast the generic element to a canvas element for better linting.
    const canvas = $("#meter");
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
    const outerMeterMesh = roundedArc(0, 0, outerRadius, meterObject.startAngle, meterObject.endAngle, meterObject.backgroundColor, lineWidth);
    const innerMeterMesh = roundedArc(0, 0, innerRadius, meterObject.startAngle, meterObject.endAngle, meterObject.backgroundColor, lineWidth);
    const dotMesh = new Arc(0, 0, outerRadius / 5, 0, Math.PI * 2, meterObject.backgroundColor, 1);
    dotMesh.fillColor = meterObject.backgroundColor;
    // Creation of the speedtest colors for the meters.
    const dlColorStops = generateColorStops("dl-color");
    const ulColorStops = generateColorStops("ul-color");
    const outerDlColor = generateGradient(canvas, dlColorStops);
    const outerUlColor = generateGradient(canvas, ulColorStops);
    const innerDlColor = generateGradient(canvas, dlColorStops.map(generateInnerColorStops));
    const innerUlColor = generateGradient(canvas, ulColorStops.map(generateInnerColorStops));
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
    // Meter progress bar creation.
    const barWidth = outerRadius;
    const barHeight = lineWidth / 2;
    const progressBar = roundedRectangle(0, 0, barWidth, barHeight, progressBarObject.color);
    const progressBarBackground = roundedRectangle(0, 0, barWidth, barHeight, progressBarObject.backgroundColor);
    const progressBarMesh = new Mesh(progressBarBackground, progressBar).translate(0, outerRadius / 1.5 - barHeight / 2);
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
const speedtestOnEnd = function (aborted) {
    if (!aborted) {
        onend();
    }
};
function onload() {
    return __awaiter(this, void 0, void 0, function* () {
        // @ts-ignore
        speedtestObject = new Speedtest();
        speedtestObject.setParameter("getIp_ispInfo", false);
        speedtestObject.setParameter("getIp_ispInfo_distance", false);
        speedtestObject.onupdate = speedtestOnUpdate;
        speedtestObject.onend = speedtestOnEnd;
        // Progress bar for the speedtest as a whole.
        // The progress bar object is for an individual state.
        createProgressBar(
        //@ts-expect-error
        $("#progress-bar"), [PROGRESS_BAR_GRADIENT], {
            styles: {
                "border-top-left-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-left-radius": BORDER_RADIUS_PRIMARY
            }
        }, {
            styles: {
                "border-top-right-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-right-radius": BORDER_RADIUS_PRIMARY
            }
        });
    });
}
const toggleHidden = function (el, duration = 1000) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const hidden = el.classList.contains("hidden");
        const height = el.clientHeight;
        const transformFunc = function (v, t) {
            t = hidden ? t : 0;
            el.css({ height: `${v}px`, opacity: t });
            return false;
        };
        if (!hidden) {
            el.setAttribute("toggle-height", String(height));
            const to = 0;
            const from = height;
            yield smoothAnimate(to, from, duration, transformFunc, easeInCubic);
            el.classList.add("hidden");
        }
        else {
            el.classList.remove("hidden");
            const to = (_a = parseFloat(el.getAttribute("toggle-height"))) !== null && _a !== void 0 ? _a : getOffset(el).height;
            const from = 0;
            yield smoothAnimate(to, from, duration, transformFunc, easeOutCubic);
            el.css({ height: "auto" });
        }
    });
};
const openingSlide = once(function () {
    return __awaiter(this, void 0, void 0, function* () {
        toggleHidden($("#start-pane"));
        [$(".speedtest-container"), $("#info-progress-container")].forEach((el) => toggleHidden(el, 500));
        openingAnimation(2000, easeInOutCubic);
    });
});
const onstart = throttle(function () {
    return __awaiter(this, void 0, void 0, function* () {
        const startButton = $("#start-btn");
        const progressBarElement = $("#progress-bar");
        const meterUnitInfoElement = $(".speedtest-container .info-container");
        const start = function () {
            return __awaiter(this, void 0, void 0, function* () {
                startButton.classList.add("running");
                $(".text", startButton).innerHTML = "Stop";
                openingSlide();
                speedtestObject.start();
            });
        };
        const abort = function () {
            return __awaiter(this, void 0, void 0, function* () {
                speedtestObject.abort();
                startButton.classList.remove("running");
                $(".text", startButton).innerHTML = "Start";
                updateTestState(true);
                openingAnimation(2000, easeInOutCubic);
                yield sleep(500);
                setUnitElementInfo({ amount: BLANK, unit: BLANK, footer: "Waiting...", kind: BLANK }, meterUnitInfoElement);
                $$(".info-progress-container .unit-container").forEach((el) => {
                    el.classList.add("in-progress");
                    setUnitElementInfo({ amount: BLANK }, el);
                });
                animateProgressBar(progressBarElement, 0, parseFloat(progressBarElement.getAttribute("percent-complete")) || 0, 1000);
            });
        };
        if (speedtestObject.getState() === 3) {
            abort();
        }
        else {
            start();
        }
    });
}, 750);
const onend = function () {
    return __awaiter(this, void 0, void 0, function* () {
        const startButton = $("#start-btn");
        const speedtestContainer = $(".speedtest-container");
        const completePane = $("#complete-pane");
        const ip = String(speedtestData.clientIp).trim().split(" ")[0].trim();
        const windowMessage = {
            message: "complete",
            key: "password",
            data: {
                dlStatus: speedtestData.dlStatus,
                ulStatus: speedtestData.ulStatus,
                pingStatus: speedtestData.pingStatus,
                jitterStatus: speedtestData.jitterStatus,
                ip: ip
            }
        };
        postMessage(eventObject, windowMessage);
        startButton.classList.toggle("running");
        yield awaitHidden();
        yield closingAnimation(2000, easeInOutCubic);
        yield toggleHidden(speedtestContainer);
        toggleHidden(completePane);
        $(".text", startButton).innerHTML = "Next →";
    });
};
$(document.getElementById("start-btn")).on("click", function (ev) {
    const duration = 1000;
    rippleButton(ev, this, $(".ripple", this), 15, 0, duration);
    const stateName = getSpeedtestStateName();
    if (stateName !== "finished") {
        onstart();
    }
    else {
        const windowMessage = {
            message: "next",
            key: "password",
            data: {}
        };
        postMessage(eventObject, windowMessage).catch(() => {
            console.error("Cannot post to null event object. Aborting.");
            $(".modal").classList.toggle("visible");
        });
    }
});
$(window).on("load", function () {
    onload();
    animationLoopOnload();
    animationLoopOuter(animationLoopOnupdate, animationLoopOndraw);
});
$(window).on("click touchend", function (ev) {
    const modal = $(".modal");
    if (ev.target == modal || modal.contains(ev.target)) {
        modal.classList.toggle("visible");
    }
});
$(window).on("message", receiveMessage);
//# sourceMappingURL=index.js.map