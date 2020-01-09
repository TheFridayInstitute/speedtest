function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(
        /[?&]+([^=&]+)=([^&]*)/gi,
        function(m, key, value) {
            vars[key] = value;
        }
    );
    return parts;
}

// INITIALIZE SPEEDTEST
var s = new Speedtest(); // create speedtest object

var meterBk = /Trident.*rv:(\d+\.\d+)/i.test(navigator.userAgent)
    ? "#EAEAEA"
    : "#80808040";
var dlColor = "#8f60aa",
    ulColor = "#f77230";
var progColor = meterBk;

// CODE FOR GAUGES
function drawMeter(c, amount, bk, fg, progress, prog) {
    var ctx = c.getContext("2d");
    var dp = window.devicePixelRatio || 1;
    var cw = c.clientWidth * dp,
        ch = c.clientHeight * dp;
    var sizScale = ch * 0.0055;
    if (c.width == cw && c.height == ch) {
        ctx.clearRect(0, 0, cw, ch);
    } else {
        c.width = cw;
        c.height = ch;
    }
    ctx.beginPath();
    ctx.strokeStyle = bk;
    ctx.lineWidth = 12 * sizScale;
    ctx.arc(
        c.width / 2,
        c.height - 58 * sizScale,
        c.height / 1.8 - ctx.lineWidth,
        -Math.PI * 1.1,
        Math.PI * 0.1
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.strokeStyle = fg;
    ctx.lineWidth = 12 * sizScale;
    ctx.arc(
        c.width / 2,
        c.height - 58 * sizScale,
        c.height / 1.8 - ctx.lineWidth,
        -Math.PI * 1.1,
        amount * Math.PI * 1.2 - Math.PI * 1.1
    );
    ctx.stroke();
    if (typeof progress !== "undefined") {
        ctx.fillStyle = prog;
        ctx.fillRect(
            c.width * 0.3,
            c.height - 16 * sizScale,
            c.width * 0.4 * progress,
            4 * sizScale
        );
    }
}

function mbpsToAmount(s) {
    return 1 - 1 / Math.pow(1.3, Math.sqrt(s));
}

function format(d) {
    d = Number(d);
    if (d < 10) return d.toFixed(2);
    if (d < 100) return d.toFixed(1);
    return d.toFixed(0);
}

// UI CODE
var UI_DATA = null;

function startStop() {
    if (s.getState() == 3) {
        // speedtest is running, abort
        s.abort();
        data = null;
        document.getElementById("startStopBtn").className = "";
        initUI();
    } else {
        // test is not running, begin
        document.getElementById("startStopBtn").className = "running";
        s.onupdate = function(data) {
            UI_DATA = data;
            let urlVars = getUrlVars();

            if (data.testState === 4) {
                $.post("backend/record.php", {
                    id: urlVars.id,
                    dlStatus: data.dlStatus,
                    ulStatus: data.ulStatus,
                    pingStatus: data.pingStatus,
                    jitterStatus: data.jitterStatus
                });
            }
        };
        s.onend = function(aborted) {
            document.getElementById("startStopBtn").className = "";
            updateUI(true);
        };
        s.start();
    }
}
// this function reads the data sent back by the test and updates the UI
function updateUI(forced) {
    if (!forced && s.getState() != 3) return;

    if (UI_DATA == null) return;

    var status = UI_DATA.testState;
    document.getElementById("ip").textContent = UI_DATA.clientIp;
    document.getElementById("dlText").textContent =
        status == 1 && UI_DATA.dlStatus == 0 ? "..." : format(UI_DATA.dlStatus);
    drawMeter(
        document.getElementById("dlMeter"),
        mbpsToAmount(
            Number(UI_DATA.dlStatus * (status == 1 ? oscillate() : 1))
        ),
        meterBk,
        dlColor,
        Number(UI_DATA.dlProgress),
        progColor
    );
    document.getElementById("ulText").textContent =
        status == 3 && UI_DATA.ulStatus == 0 ? "..." : format(UI_DATA.ulStatus);
    drawMeter(
        document.getElementById("ulMeter"),
        mbpsToAmount(
            Number(UI_DATA.ulStatus * (status == 3 ? oscillate() : 1))
        ),
        meterBk,
        ulColor,
        Number(UI_DATA.ulProgress),
        progColor
    );
    document.getElementById("pingText").textContent = format(
        Math.round(UI_DATA.pingStatus)
    );
    document.getElementById("jitText").textContent = format(
        UI_DATA.jitterStatus
    );
}
function oscillate() {
    return 1 + 0.02 * Math.sin(Date.now() / 100);
}
// update the UI every frame
window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback, element) {
        setTimeout(callback, 1000 / 60);
    };
function frame() {
    requestAnimationFrame(frame);
    updateUI();
}
frame(); // start frame loop
// function to (re)initialize UI

function initUI() {
    drawMeter(document.getElementById("dlMeter"), 0, meterBk, dlColor, 0);
    drawMeter(document.getElementById("ulMeter"), 0, meterBk, ulColor, 0);
    document.getElementById("dlText").textContent = "";
    document.getElementById("ulText").textContent = "";
    document.getElementById("pingText").textContent = "";
    document.getElementById("jitText").textContent = "";
    document.getElementById("ip").textContent = "";
}

window.onload = function() {
    setTimeout(function() {
        initUI();
    }, 100);
};
