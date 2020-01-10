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

document.getElementById("startStopBtn").addEventListener("click", function(e) {
    UI_DATA = startStop();

    toggleOnce(document.getElementById("startStopBtn"), function() {
        let gaugeNumbers = range(0, 70, 10);
        let shift = -90;

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
    });
});

function startStop() {
    let data = null;
    if (speedtestObj.getState() == 3) {
        // speedtest is running, abort
        speedtestObj.abort();
        data = null;
        document.getElementById("startStopBtn").classList.remove("running");
        document.getElementById("startStopBtn").innerHTML = "Go";

        initUI();
    } else {
        // test is not running, begin
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
            document.getElementById("startStopBtn").className = "";
            updateUI(true);
        };

        speedtestObj.start();
    }
    return UI_DATA;
}

let meterBackgroundColor = "#80808080";

let progColor = "#fff";

let downloadColorStops = [
    ["0", "#8343ab"],
    ["0.5", "#d359ff"],
    ["1.0", "#f71e6a"]
];

let downloadColor = generateGradient(
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
let uploadProgressColor = generateGradient(
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
        downloadColor,
        0
    );
    drawMeter(
        document.getElementById("ulMeter"),
        0,
        meterBackgroundColor,
        uploadProgressColor,
        0
    );
    document.getElementById("dlText").textContent = "";
    document.getElementById("ulText").textContent = "";
    document.getElementById("pingText").textContent = "";
}

function updateUI(forced) {
    if (!forced && speedtestObj.getState() != 3) return;

    if (UI_DATA == null) return;

    var status = UI_DATA.testState;
    // let ip = String(UI_DATA.clientIp);
    let ip = "75.177.182.41 - Charter Communications Inc, US";

    if (ip.length < 100 && ip.length > 0) {
        ip = ip.split("-")[0];
        document.getElementById("ip").textContent = ip;
    }

    document.getElementById("dlText").textContent =
        status == 1 && UI_DATA.dlStatus == 0 ? "..." : UI_DATA.dlStatus;

    let dlAmount = mbpsToAmount(
        Number(UI_DATA.dlStatus * (status == 1 ? oscillate() : 1))
    );

    drawMeter(
        document.getElementById("dlMeter"),
        dlAmount,
        meterBackgroundColor,
        downloadColor,
        Number(UI_DATA.dlProgress),
        progColor
    );

    document.getElementById("ulText").textContent =
        status == 3 && UI_DATA.ulStatus == 0 ? "..." : UI_DATA.ulStatus;

    let ulAmount = mbpsToAmount(
        Number(UI_DATA.ulStatus * (status == 3 ? oscillate() : 1))
    );

    console.log(dlAmount, ulAmount);

    drawMeter(
        document.getElementById("ulMeter"),
        ulAmount,
        meterBackgroundColor,
        uploadProgressColor,
        Number(UI_DATA.ulProgress),
        progColor
    );

    document.getElementById("pingText").textContent = Math.round(
        UI_DATA.pingStatus
    );

    // if (status !== 3) {
    //     if (UI_DATA.dlStatus !== 0) {
    //         document.getElementById("dlText2").textContent = UI_DATA.dlStatus;
    //     }
    // }
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
