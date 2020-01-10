import {
    getUrlParams,
    oscillate,
    drawMeter,
    mbpsToAmount,
    generateGradient,
    setGaugeNumbers,
    range,
    toggleOnce
} from "./utils.js";

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
    let shift = -150;

    setGaugeNumbers(
        document.getElementById("dl-meter-container"),
        gaugeNumbers,
        0,
        shift
    );
    setGaugeNumbers(
        document.getElementById("ul-meter-container"),
        gaugeNumbers,
        0,
        shift
    );
};

document.getElementById("startStopBtn").addEventListener("click", function(e) {
    UI_DATA = startStop();

    toggleOnce(document.getElementById("startStopBtn"), function() {
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
        document.getElementById("startStopBtn").classList.remove("running");
        document.getElementById("startStopBtn").innerHTML = "Start";

        initUI();
    } else {
        document.getElementById("startStopBtn").classList.add("running");
        document.getElementById("startStopBtn").innerHTML = "Stop";
        speedtestObj.onupdate = function(data) {
            UI_DATA = data;

            let urlParams = getUrlParams(window.location.href);

            if (data.testState === 4) {
                $.post("backend/record.php", {
                    id: urlParams.id || -1,
                    dlStatus: data.dlStatus,
                    ulStatus: data.ulStatus,
                    pingStatus: data.pingStatus,
                    jitterStatus: data.jitterStatus
                });
            }
        };

        speedtestObj.onend = function(aborted) {
            document.getElementById("startStopBtn").innerHTML = "Start";
            document.getElementById("startStopBtn").classList.remove("running");
            updateUI(true);
        };

        speedtestObj.start();
    }
    return UI_DATA;
}

let meterBackgroundColor = "#80808080";
let progressBarColor = "#fff";

let downloadColorStops = [
    ["0", "#8343ab"],
    ["0.5", "#d359ff"],
    ["1.0", "#f71e6a"]
];
let dlProgressColor = generateGradient(
    document.getElementById("dlMeter"),
    0,
    0,
    document.getElementById("dlMeter").width,
    0,
    downloadColorStops
);

let uploadColorStops = [
    ["0", "#FF8000"],
    ["0.5", "#FF8000"],
    ["1.0", "#FF0000"]
];
let ulProgressColor = generateGradient(
    document.getElementById("ulMeter"),
    0,
    0,
    document.getElementById("ulMeter").width,
    0,
    uploadColorStops
);

function initUI() {
    drawMeter(
        document.getElementById("dlMeter"),
        0,
        meterBackgroundColor,
        dlProgressColor,
        0
    );
    drawMeter(
        document.getElementById("ulMeter"),
        0,
        meterBackgroundColor,
        ulProgressColor,
        0
    );
    document.getElementById("dlText").innerHTML = "";
    document.getElementById("ulText").innerHTML = "";
    document.getElementById("pingText").innerHTML = "";
}

function drawGaugeWrapper(
    status,
    gaugeEl,
    gaugeTextEl,
    gaugeAmount,
    gaugeProgress,
    backgroundColor,
    arcProgressColor,
    barProgressColor
) {
    gaugeAmount = Number(gaugeAmount);
    gaugeProgress = Number(gaugeProgress);

    if (status === 1 && gaugeAmount === 0) {
        gaugeTextEl.innerHTML = "...";
    } else {
        gaugeTextEl.innerHTML = gaugeAmount.toPrecision(3);
    }
    let gaugeMbpsAmount = mbpsToAmount(
        gaugeAmount * (status == 1 ? oscillate() : 1)
    );
    drawMeter(
        gaugeEl,
        gaugeMbpsAmount,
        backgroundColor,
        arcProgressColor,
        gaugeProgress,
        barProgressColor
    );
}

function updateUI(forced) {
    if (!forced && speedtestObj.getState() != 3) return;

    if (UI_DATA == null) return;

    let ip = String(UI_DATA.clientIp);

    if (ip.length < 100 && ip.length > 0) {
        ip = ip.split("-")[0]; // CHANGE THIS LATER!!
        document.getElementById("ip").innerHTML = ip;
    }

    drawGaugeWrapper(
        UI_DATA.testState,
        document.getElementById("dlMeter"),
        document.getElementById("dlText"),
        UI_DATA.dlStatus,
        UI_DATA.dlProgress,
        meterBackgroundColor,
        dlProgressColor,
        progressBarColor
    );

    drawGaugeWrapper(
        UI_DATA.testState,
        document.getElementById("ulMeter"),
        document.getElementById("ulText"),
        UI_DATA.ulStatus,
        UI_DATA.ulProgress,
        meterBackgroundColor,
        ulProgressColor,
        progressBarColor
    );

    document.getElementById("pingText").innerHTML = Math.round(
        UI_DATA.pingStatus
    );
}

function frame() {
    requestAnimationFrame(frame);
    updateUI();
}
frame();

window.onload = function() {
    setTimeout(function() {
        initUI();
    }, 100);
};
