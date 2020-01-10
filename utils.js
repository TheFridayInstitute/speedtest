export {
    getUrlParams,
    oscillate,
    drawMeter,
    mbpsToAmount,
    generateGradient,
    getOffset,
    setGaugeNumbers,
    range,
    toggleOnce
};

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
