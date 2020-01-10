

function range(start, end, step = 1) {
    const len = Math.floor((end - start) / step) + 1;
    return Array(len)
        .fill()
        .map((_, idx) => start + idx * step);
}

function setGaugeNumbers(gaugeEl, numbers, offsetX, offsetY, radius) {
    let gaugeOffset = getOffset(gaugeEl);
    radius = radius === undefined ? gaugeOffset.height / 2.5 : radius;

    let delay = 100;

    let numbersEl = [];

    for (let number of numbers) {
        let child = document.createElement("div");
        child.innerText = number;
        child.classList.add("gauge-numbers");
        numbersEl.push(child);
        gaugeEl.appendChild(child);
    }

    let originX = gaugeOffset.width / 2;
    let originY = gaugeOffset.height + offsetY;

    let theta = Math.PI;
    let d_theta = Math.PI / (numbersEl.length - 1);

    numbersEl.forEach((child, n) => {
        let childOffset = getOffset(child);

        let t_x = radius * Math.cos(theta);
        let t_y = radius * Math.sin(theta);

        t_x += originX - childOffset.width / 2;
        t_y += originY - childOffset.height / 2;

        child.style.transitionDelay = `${delay * n}ms`;
        child.style.transform = `translate(${t_x}px, ${t_y}px)`;

        theta += d_theta;
    });
}

function getUrlParams(qs) {
    qs = qs.split("+").join(" ");

    let params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while ((tokens = re.exec(qs))) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}

function oscillate(a, b, frequency) {
    a = a == undefined ? 0.02 : a;
    b = b == undefined ? 0.02 : b;
    frequency = frequency === undefined ? 100 : frequency;

    let r = Math.random() * (b - a) + a;

    return 1 + r * Math.sin(Date.now() / frequency);
}

function drawMeter(
    c,
    amount,
    backgroundColor,
    progressColor,
    progressAmount,
    progressBarColor
) {
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
    ctx.strokeStyle = backgroundColor;
    ctx.lineWidth = 12 * sizScale;
    ctx.arc(
        c.width / 2,
        c.height - 58 * sizScale,
        c.height / 1.8 - ctx.lineWidth,
        -Math.PI * 1.1,
        Math.PI * 0.1
    );
    ctx.shadowBlur = 2;
    ctx.shadowColor = "black";
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = progressColor;
    ctx.lineWidth = 12 * sizScale;
    ctx.arc(
        c.width / 2,
        c.height - 58 * sizScale,
        c.height / 1.8 - ctx.lineWidth,
        -Math.PI * 1.1,
        amount * Math.PI * 1.2 - Math.PI * 1.1
    );

    ctx.shadowBlur = 1;
    ctx.shadowColor = "red";

    ctx.stroke();
    if (typeof progressAmount !== "undefined") {
        ctx.fillStyle = progressBarColor;
        ctx.fillRect(
            c.width * 0.3,
            c.height - 16 * sizScale,
            c.width * 0.4 * progressAmount,
            4 * sizScale
        );
        ctx.shadowBlur = 0;
    }
}

function mbpsToAmount(s) {
    return 1 - 1 / Math.pow(1.3, Math.sqrt(s));
}

function generateGradient(c, x0, y0, x1, y1, colorStops) {
    let ctx = c.getContext("2d");
    let gradient = ctx.createLinearGradient(x0, y0, x1, y1);

    for (let [stop, color] of colorStops) {
        gradient.addColorStop(stop, color);
    }
    return gradient;
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toggle(el, firstCallback, secondCallback) {
    let toggled = el.getAttribute("toggled") === "true";
    if (!toggled) {
        firstCallback(el);
    } else {
        secondCallback(el);
    }
    el.setAttribute("toggled", !toggled);
    return;
}

function toggleOnce(el, firstCallback) {
    let toggled = el.getAttribute("toggled") === "true";
    if (!toggled) {
        firstCallback(el);
        el.setAttribute("toggled", true);
    }
    return;
}

function slideToggle(el) {
    let slideHeight;
    if (!el.getAttribute("slide-height")) {
        el.style.height = "100%";
        slideHeight = getOffset(el).height;
        el.setAttribute("slide-height", slideHeight);
        el.style.height = `${slideHeight}px`;

        return;
    } else {
        slideHeight = el.getAttribute("slide-height");
    }

    if (el.style.height === "0px") {
        requestAnimationFrame(() => {
            el.style.height = `${slideHeight}px`;
        });
        el.style.overflow = "visible";
    } else {
        requestAnimationFrame(() => {
            el.style.height = 0;
            el.style.overflow = "hidden";
        });
    }
}

function DeCasteljau(t, points) {
    let dp = new Map();

    function _DeCasteljau(t, points, ix1, ix2, n) {
        let k = `${n}${ix1}${ix2}`;

        if (dp.has(k)) {
            return dp.get(k);
        }

        let b0, b1;

        if (n == 1) {
            b0 = points[ix1];
            b1 = points[ix2];
        } else {
            n--;
            b0 = _DeCasteljau(t, points, ix1, ix2, n);
            b1 = _DeCasteljau(t, points, ix2, ix2 + 1, n);
        }
        let v = (1 - t) * b0 + t * b1;
        dp.set(k, v);

        return v;
    }
    return _DeCasteljau(t, points, 0, 1, points.length - 1);
}

function cubicBezier(t, x1, y1, x2, y2) {
    return [DeCasteljau(t, [0, x1, x2, 1]), DeCasteljau(t, [0, y1, y2, 1])];
}

function wrap(toWrap, wrapper) {
    let wrapped = toWrap.parentNode.insertBefore(wrapper, toWrap);
    return wrapped.appendChild(toWrap);
}

function affixer(preAffixFunc, postAffixFunc) {
    const offsets = [];

    document.querySelectorAll(".affix").forEach((el, n) => {
        let offset = getOffset(el);
        offsets.push(offset);
        let wrapped = document.createElement("div");

        wrapped.style.height = `${offset.height}px`;
        wrapped.style.width = `${offset.width}px`;
        // wrapped.style.marginTop = `${offset.top}px`;

        wrap(el, wrapped);
    });

    window.addEventListener("resize", function(e) {
        scrollAffix();
    });

    window.addEventListener("scroll", scrollAffix);
    function scrollAffix() {
        document.querySelectorAll(".affix").forEach((el, n) => {
            let affixY = offsets[n].top;

            if (self.pageYOffset > affixY) {
                preAffixFunc(el, n);
                el.style.zIndex = 999;
                el.style.position = "fixed";
                el.style.top = `${0}px`;
                el.style.width = `${window.innerWidth - 2 * offsets[n].left}px`;
            } else {
                postAffixFunc(el, n);
                el.style.top = `${0}px`;
                el.style.position = "relative";
                el.style.width = `${window.innerWidth - 2 * offsets[n].left}px`;
            }
        });
    }
}

function getOffset(el) {
    const rect = el.getBoundingClientRect();
    return {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height
    };
}


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




