<template>
    <div class="flex max-h-[1080px] min-h-screen w-full flex-col">
        <div
            :class="`pointer-events-none sticky top-0 z-[100] col-span-2 flex h-fit w-full
                flex-row-reverse items-center justify-between justify-items-center gap-6 p-4
                lg:absolute lg:right-0 lg:w-min lg:items-start lg:justify-center lg:gap-4`"
        >
            <DarkModeToggle
                class="pointer-events-auto absolute right-0 aspect-square w-8 hover:scale-105
                    hover:opacity-50"
            ></DarkModeToggle>

            <HoverCard
                :open-delay="0"
                class="bg-sky-700 px-4 py-2 text-white hover:bg-sky-800 sm:px-8 sm:py-3"
            >
                <HoverCardTrigger class="fira-code pointer-events-auto">
                    <Button class="m-0 cursor-pointer p-0" variant="link"
                        >@mbabb</Button
                    >
                </HoverCardTrigger>
                <HoverCardContent class="pointer-events-auto z-[100]">
                    <div class="fira-code flex gap-4 p-4">
                        <Avatar>
                            <AvatarImage
                                src="https://avatars.githubusercontent.com/u/2848617?v=4"
                            >
                            </AvatarImage>
                        </Avatar>
                        <div>
                            <h4 class="text-sm font-semibold hover:underline">
                                <a href="https://github.com/mkbabb">@mbabb</a>
                            </h4>
                            <p>
                                Check out the project on
                                <a
                                    class="font-bold hover:underline"
                                    href="https://github.com/TheFridayInstitute/speedtest"
                                    >GitHub</a
                                >🎉
                            </p>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        </div>

        <div
            ref="gridBackground"
            class="grid-background absolute h-full w-full"
        ></div>

        <div
            class="ipinfo-container z-10 grid w-full columns-2 gap-2 self-start p-4"
        >
            <div
                class="fraunces col-span-2 text-2xl font-bold text-purple-400"
                v-if="lookedUpIp?.row"
            >
                {{ lookedUpIp?.row?.["Entity Name"] }},
                <span class="font-normal italic">{{
                    lookedUpIp?.row?.["Entity ID"]
                }}</span>
            </div>

            <div class="text-md col-span-1 font-bold">
                {{ clientIp }} :
                <span class="font-normal italic">{{ ipInfo?.org }}</span>
            </div>
        </div>

        <Tabs
            default-value="speedtest"
            class="flex h-full w-full flex-col items-center justify-center justify-items-center"
        >
            <TabsList class="fraunces m-auto grid grid-cols-2">
                <TabsTrigger value="speedtest">Speed Test</TabsTrigger>
                <TabsTrigger value="dnsspeedtest">DNS Speed Test</TabsTrigger>
            </TabsList>

            <TabsContent
                class="h-full w-full"
                :force-mount="true"
                value="speedtest"
            >
                <main class="m-auto">
                    <Card class="pane-container" id="start-pane">
                        <CardContent class="fraunces content">
                            <CardTitle class="fraunces text-6xl font-bold">
                                Let's test your internet speed.
                            </CardTitle>

                            <hr class="my-6 h-2 rounded-sm bg-foreground" />

                            <p>
                                Up to
                                <span class="fira-code font-bold">25 MB</span>
                                of data on
                                <span class="font-bold">cellular</span> or
                                <span class="font-bold">satellite</span>
                                connections may be consumed.

                                <br />
                                <br />

                                Press the
                                <span
                                    class="rounded-sm p-2 font-bold text-purple-400"
                                    >Start</span
                                >
                                button to begin.
                            </p>
                        </CardContent>
                    </Card>

                    <Card class="pane-container hidden" id="complete-pane">
                        <CardContent class="content">
                            <CardTitle>Speed test complete.</CardTitle>

                            <hr />

                            <p>Click the Next → button to continue.</p>
                        </CardContent>
                    </Card>

                    <section
                        class="pane-container speedtest-container relative hidden"
                    >
                        <div
                            class="speedtest square-box grid justify-center justify-items-center"
                        >
                            <canvas class="square-box" id="meter"></canvas>
                        </div>

                        <div class="info-container">
                            <div class="info">
                                <div class="header"></div>

                                <div class="unit-container">
                                    <div
                                        class="amount"
                                        aria-label="active-test-speed"
                                    >
                                        &nbsp;
                                    </div>
                                    <div class="italic unit">&nbsp;</div>
                                </div>

                                <div class="footer">Waiting...</div>
                            </div>

                            <div class="kind">&nbsp;</div>
                        </div>
                    </section>

                    <section
                        class="info-progress-container hidden"
                        id="info-progress-container"
                    >
                        <div class="info-container">
                            <div class="info" id="ping">
                                <div class="header">Latency</div>

                                <div class="unit-container in-progress">
                                    <div class="amount" aria-label="latency">
                                        &nbsp;
                                    </div>
                                    <div class="italic unit">ms</div>
                                </div>
                            </div>

                            <div class="info" id="download">
                                <div class="header">Download</div>
                                <div class="unit-container in-progress">
                                    <div
                                        class="amount"
                                        aria-label="download-speed"
                                    >
                                        &nbsp;
                                    </div>
                                    <div class="italic unit">Mbps</div>
                                </div>
                            </div>

                            <div class="info" id="upload">
                                <div class="header">Upload</div>
                                <div class="unit-container in-progress">
                                    <div
                                        class="amount"
                                        aria-label="upload-speed"
                                    >
                                        &nbsp;
                                    </div>
                                    <div class="italic unit">Mbps</div>
                                </div>
                            </div>
                        </div>
                        <div
                            class="progress-bar-container"
                            id="progress-bar"
                        ></div>
                    </section>

                    <Button
                        class="start-btn fira-code m-4 p-4 text-2xl font-bold"
                        id="start-btn"
                    >
                        <span class="text">Start</span>
                        <div class="ripple"></div>
                    </Button>
                </main>
            </TabsContent>

            <TabsContent
                class="w-full0 h-full"
                :force-mount="true"
                value="dnsspeedtest"
            >
                <main class="m-auto">
                    <Card class="pane-container" id="dns-start-pane">
                        <CardContent class="fraunces content">
                            <CardTitle class="fraunces text-6xl font-bold">
                                Let's test your internet speed.
                            </CardTitle>

                            <hr class="my-6 h-2 rounded-sm bg-foreground" />

                            <p>
                                This test will measure the speed of your
                                internet connection using DNS queries. Press the
                                <span
                                    class="rounded-sm p-2 font-bold text-purple-400"
                                    >Start</span
                                >
                                button to begin.
                            </p>
                        </CardContent>
                    </Card>

                    <Button
                        @click="startDNSSpeedtest"
                        ref="dnsStartBtn"
                        class="start-btn fira-code grid-area:none m-4 w-full p-4 text-2xl font-bold"
                        id="dns-start-btn"
                    >
                        <span class="text">Start</span>
                        <div class="ripple"></div>
                    </Button>

                    <Card
                        class="pane-container hidden overflow-scroll"
                        id="dns-result-pane"
                    >
                        <CardContent
                            class="content relative max-h-[70vh] overflow-scroll"
                        >
                            <div class="bg-background">
                                <CardTitle class="fraunces font-normal italic"
                                    >{{ clientUID }}
                                </CardTitle>

                                <h2
                                    v-if="
                                        dnsResult?.speedtest_dl_speed &&
                                        Number.isFinite(
                                            dnsResult?.speedtest_dl_speed,
                                        )
                                    "
                                    class="bold my-4 text-5xl"
                                >
                                    {{
                                        getFormattedSpeed(
                                            dnsResult?.speedtest_dl_speed,
                                        )
                                    }}
                                </h2>

                                <h2 v-else class="bold my-4 text-5xl">
                                    <div class="dot-container">
                                        <div class="dot-typing"></div>
                                    </div>
                                </h2>
                            </div>

                            <hr class="my-6 h-2 rounded-sm bg-foreground" />

                            <div>
                                <pre
                                    class="mt-4 overflow-auto rounded-md p-4"
                                ><code id="dns-result-json">{{ dnsResult }}</code></pre>
                            </div>
                        </CardContent>
                    </Card>
                </main>
            </TabsContent>
        </Tabs>
    </div>
</template>

<script setup lang="ts">
import { DarkModeToggle } from "@components/custom/dark-mode-toggle";
import {
    Card,
    CardContent,
    CardHeader,
    CardDescription,
    CardTitle,
} from "@components/ui/card";

import { Button } from "@components/ui/button";

import {
    HoverCard,
    HoverCardTrigger,
    HoverCardContent,
} from "@components/ui/hover-card";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@components/ui/tabs";

import { Avatar, AvatarImage } from "@components/ui/avatar";

// @ts-ignore
import githubDark from "highlight.js/styles/github-dark.css?inline";
// @ts-ignore
import githubLight from "highlight.js/styles/github.css?inline";

import {
    Polygon,
    Arc,
    Mesh,
    Canvas,
    roundedArc,
    setRoundedArcColor,
    roundedRectangle,
    CanvasColor,
    generateGradient,
} from "@utils/canvas";

import {
    clamp,
    lerp,
    normalize,
    easeInOutCubic,
    slerpPoints,
    easeOutCubic,
    easeInCubic,
    hysteresis,
} from "@utils/math";

import {
    smoothAnimate,
    animationLoopOuter,
    sleep,
    createProgressBar,
    animateProgressBarWrapper,
    animateProgressBar,
    rippleButton,
    throttle,
} from "@utils/animation";

import {
    getOffset,
    once,
    getComputedVariable,
    emToPixels,
    generateColorStops,
    generateInnerColorStops,
    getIP,
    awaitHidden,
    getIPInfo,
    lookupIP,
} from "@utils/utils";

import { $, $$, DomElement, IDollarElement } from "@utils/dollar";

import "@styles/style.scss";
import "@styles/extras.scss";
import "@styles/utils.scss";

import { Speedtest } from "@utils/librespeed/speedtest";

import { onMounted, ref, watch } from "vue";

// Global speedtest and event state variables.
let eventObject: MessageEvent;

let speedtestObject;
let speedtestData;

// Global state variables for the canvas
let canvasObject: Canvas;

interface MeterObject {
    startAngle: number;
    endAngle: number;

    minValue: number;
    maxValue: number;

    lineWidth: number;

    backgroundColor: CanvasColor;

    outerMeter?: {
        mesh: Mesh;
        radius: number;
        dlColor: CanvasColor;
        ulColor: CanvasColor;
    };

    innerMeter?: {
        mesh: Mesh;
        radius: number;
        dlColor: CanvasColor;
        ulColor: CanvasColor;
    };

    dial?: {
        color: CanvasColor;
        mesh: Polygon;
    };

    dot?: {
        color: CanvasColor;
        mesh: Arc;
        radius: number;
    };
}

interface ProgressBarObject {
    mesh?: Mesh;
    color: CanvasColor;
    backgroundColor: CanvasColor;
}

interface WindowMessage {
    message: string;
    key: string;
    data: { [arg: string]: string };
}

enum TestState {
    notStarted = 0,
    started = 1,
    active = 2,
    finished = 3,
    drawFinished = 4,
}

enum SpeedtestState {
    notStarted = 0,
    started = 1,
    download = 2,
    ping = 3,
    upload = 4,
    finished = 5,
    aborted = 6,
}

const SPEEDTEST_STATE_MAP = Object.freeze({
    0: "notStarted",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted",
});

const SPEEDTEST_DATA_MAP = Object.freeze({
    pingAmount: "pingStatus",
    downloadAmount: "dlStatus",
    uploadAmount: "ulStatus",
    pingProgress: "pingProgress",
    downloadProgress: "dlProgress",
    uploadProgress: "ulProgress",
});

interface TestStateObject {
    ping: TestState;
    download: TestState;
    upload: TestState;

    prevState: SpeedtestState;
}

interface UnitInfo {
    amount?: string;
    unit?: string;
    kind?: string;

    header?: string;
    footer?: string;
}

const testStateObject: TestStateObject = {
    ping: TestState.notStarted,
    download: TestState.notStarted,
    upload: TestState.notStarted,

    prevState: SpeedtestState.notStarted,
};

let meterObject: MeterObject = {
    startAngle: Math.PI * 0.8,
    endAngle: 2 * Math.PI * 1.1,

    minValue: 0,
    maxValue: 100,

    lineWidth: 2 * emToPixels(getComputedVariable("font-size")),

    backgroundColor: getComputedVariable("--meter-background-color"),
};

let progressBarObject: ProgressBarObject = {
    color: "#fff",
    backgroundColor: meterObject.backgroundColor,
};

const DOTS = `<div class="dot-container"><div class="dot-typing"></div></div>`;
const BLANK = "&nbsp;";
const BORDER_RADIUS_PRIMARY = getComputedVariable("--border-radius-primary");
const PROGRESS_BAR_GRADIENT = getComputedVariable("--progress-bar-gradient");

const WINDOW_KEY = "password";

const receiveMessage = function (event: MessageEvent) {
    const data = event.data;
    if (data.key === WINDOW_KEY) {
        eventObject = event;
        console.log(`Received event data of ${data}`);

        if (data.message === "start") {
            onstart();
        }
    } else {
        console.warn("Event data not accepted.");
    }
};

const postMessage = function (
    eventObject: MessageEvent,
    windowMessage: WindowMessage,
) {
    return new Promise((resolve, reject) => {
        if (eventObject != null) {
            console.log(`Posting event message of ${windowMessage.message}`);
            // @ts-expect-error
            eventObject.source.postMessage(windowMessage, eventObject.origin);
            resolve(windowMessage);
        } else {
            reject(new Error("The given event object was null."));
        }
    });
};

const animateProgressBarEl = function () {
    //@ts-expect-error
    animateProgressBarWrapper($("#progress-bar"), 1000, 3);
};

const openingAnimation = async function (duration: number, timingFunc: any) {
    const { dot, outerMeter, dial } = meterObject;

    const transformFunc = function (v: number, t: number) {
        canvasObject.clear();

        outerMeter.mesh.draw(canvasObject, t);
        dot.mesh.draw(canvasObject, t);

        const theta = lerp(
            t,
            meterObject.startAngle,
            meterObject.startAngle + 2 * Math.PI,
        );

        dial.mesh
            .rotate(theta, true)
            .scale(1)

            .draw(canvasObject)

            .rotate(-theta, true)
            .scale(1);

        progressBarObject.mesh.draw(canvasObject, 0);

        return false;
    };
    await smoothAnimate(
        meterObject.endAngle,
        meterObject.startAngle,
        duration,
        transformFunc,
        timingFunc,
    );
};

const closingAnimation = async function (duration: number, timingFunc: any) {
    const { dot, outerMeter, dial } = meterObject;

    const transformFunc = function (v: number, t: number) {
        canvasObject.clear();
        t = clamp(1 - t, 0.0001, 1);

        outerMeter.mesh.draw(canvasObject, t);
        dot.mesh.draw(canvasObject, t);

        const theta = lerp(
            t,
            meterObject.startAngle,
            4 * Math.PI + meterObject.startAngle,
        );

        dial.mesh
            .rotate(theta, true)
            .scale(t)

            .draw(canvasObject)

            .rotate(-theta, true)
            .scale(1 / t);

        progressBarObject.mesh.draw(canvasObject, t);
        return false;
    };
    await smoothAnimate(
        meterObject.endAngle,
        meterObject.startAngle,
        duration,
        transformFunc,
        timingFunc,
    );
};

const drawMeter = function (stateName: string) {
    const { dot, outerMeter, innerMeter, dial, backgroundColor } = meterObject;

    let outerMeterColor: CanvasColor = backgroundColor;
    let innerMeterColor: CanvasColor = backgroundColor;

    if (stateName === "download") {
        outerMeterColor = outerMeter.dlColor;
        innerMeterColor = innerMeter.dlColor;
    } else if (stateName === "upload") {
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
    } else {
        const stateAmount = getSpeedtestStateAmount(stateName);
        let t = normalize(
            clamp(stateAmount, meterObject.minValue, meterObject.maxValue),
            meterObject.minValue,
            meterObject.maxValue,
        );

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

const drawMeterProgressBar = function (stateName?: string) {
    if (stateName == null) {
        progressBarObject.mesh.draw(canvasObject, 0);
    } else {
        const stateAmount = getSpeedtestStateAmount(stateName, "Progress");

        let t = clamp(stateAmount, 0, 1);
        t = hysteresis(t, "progressBar");
        progressBarObject.mesh.draw(canvasObject, t);
    }
};

const getSpeedtestStateAmount = function (
    stateName: string,
    stateKind = "Amount",
) {
    if (speedtestData == null) {
        return undefined;
    } else {
        const key = stateName + stateKind;
        const stateAmount = parseFloat(speedtestData[SPEEDTEST_DATA_MAP[key]]);
        const upperBound = stateKind === "Amount" ? 99999 : 1;

        return Number.isNaN(stateAmount)
            ? 0
            : clamp(stateAmount, 0, upperBound);
    }
};

const getSpeedtestStateName = function () {
    if (speedtestData == null) {
        return undefined;
    } else {
        return SPEEDTEST_STATE_MAP[speedtestData.testState + 1];
    }
};

const getStateUnitInfo = function (stateName?: string, stateAmount?: number) {
    stateAmount = stateAmount ?? getSpeedtestStateAmount(stateName);

    const unitInfo: UnitInfo = {};

    if (stateName === "download" || stateName === "upload") {
        if (stateAmount < 1000) {
            unitInfo["unit"] = "Mbps";
        } else if (stateAmount >= 1000) {
            unitInfo["unit"] = "Gbps";
            stateAmount /= 1000;
        }
        unitInfo["amount"] = stateAmount.toPrecision(3);
    } else if (stateName === "ping") {
        if (stateAmount < 1000) {
            unitInfo["unit"] = "ms";
        } else if (stateAmount >= 1000) {
            unitInfo["unit"] = "s";
            stateAmount /= 1000;
        }
        unitInfo["amount"] = stateAmount.toPrecision(3);
    }

    return unitInfo;
};

const setUnitElementInfo = function (
    info: UnitInfo,
    unitInfoElement: DomElement,
) {
    Object.keys(info).forEach((key) => {
        const classKey = `.${key}`;
        $(classKey, unitInfoElement).innerHTML = info[key];
    });
};

const updateTestStateInfo = function (stateName: string) {
    if (["ping", "download", "upload"].indexOf(stateName) === -1) {
        return;
    }
    const unitContainerElement = $(`#${stateName} .unit-container`);
    const testState = testStateObject[stateName];

    if (testState === TestState.started) {
        $(".amount", unitContainerElement).innerHTML = DOTS;
    } else if (testState === TestState.active) {
        const meterUnitInfoElement = $(".speedtest-container .info-container");
        let unitInfo = getStateUnitInfo(stateName);

        if (stateName === "ping") {
            unitInfo = { ...unitInfo, footer: "Latency" };
            setUnitElementInfo(unitInfo, meterUnitInfoElement);
        } else if (stateName === "download") {
            unitInfo = { ...unitInfo, kind: "↓", footer: "Download" };
            setUnitElementInfo(unitInfo, meterUnitInfoElement);
        } else if (stateName === "upload") {
            unitInfo = { ...unitInfo, kind: "↑", footer: "Upload" };
            setUnitElementInfo(unitInfo, meterUnitInfoElement);
        }
    } else if (testState === TestState.finished) {
        const unitInfo = getStateUnitInfo(stateName);

        animateProgressBarEl();

        unitContainerElement.classList.remove("in-progress");
        setUnitElementInfo(unitInfo, unitContainerElement);

        testStateObject[stateName] = TestState.drawFinished;
    }
};

const updateTestState = function (abort = false) {
    const testState: SpeedtestState = speedtestData.testState + 1;
    const testStateName = SPEEDTEST_STATE_MAP[testState];
    const prevTestStateName = SPEEDTEST_STATE_MAP[testStateObject.prevState];

    if (abort) {
        Object.keys(testStateObject).forEach((key) => {
            testStateObject[key] = TestState.notStarted;
        });
    } else {
        if (
            testStateObject.prevState !== SpeedtestState.notStarted &&
            testState !== testStateObject.prevState
        ) {
            testStateObject[testStateName] = TestState.started;
            testStateObject[prevTestStateName] = TestState.finished;
            updateTestStateInfo(prevTestStateName);
        } else {
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

    if (
        stateName === "ping" ||
        stateName === "download" ||
        stateName === "upload"
    ) {
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
    const canvas = <HTMLCanvasElement & IDollarElement>$("#meter");
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
        [dialBase, 0],
    ];

    const points = slerpPoints(baseCoords[0], baseCoords[1]);

    const dialPoints = [
        ...points,
        [dialBase - dialTop, -dialHeight],
        [dialTop, -dialHeight],
    ];

    const dialMesh = new Polygon(dialPoints, null, null, "white");
    dialMesh.translate(-dialMesh.centroid[0], 0).rotate(90, false);

    const outerMeterMesh = roundedArc(
        0,
        0,
        outerRadius,
        meterObject.startAngle,
        meterObject.endAngle,
        meterObject.backgroundColor,
        lineWidth,
    );

    const innerMeterMesh = roundedArc(
        0,
        0,
        innerRadius,
        meterObject.startAngle,
        meterObject.endAngle,
        meterObject.backgroundColor,
        lineWidth,
    );

    const dotMesh = new Arc(
        0,
        0,
        outerRadius / 5,
        0,
        Math.PI * 2,
        meterObject.backgroundColor,
        1,
    );
    dotMesh.fillColor = meterObject.backgroundColor;

    // Creation of the speedtest colors for the meters.
    const dlColorStops = generateColorStops("dl-color");
    const ulColorStops = generateColorStops("ul-color");

    const outerDlColor = generateGradient(canvas, dlColorStops);
    const outerUlColor = generateGradient(canvas, ulColorStops);

    const innerDlColor = generateGradient(
        canvas,
        dlColorStops.map(generateInnerColorStops),
    );
    const innerUlColor = generateGradient(
        canvas,
        ulColorStops.map(generateInnerColorStops),
    );

    meterObject = Object.assign(meterObject, {
        outerMeter: {
            mesh: outerMeterMesh,
            radius: outerRadius,
            dlColor: outerDlColor,
            ulColor: outerUlColor,
        },

        innerMeter: {
            mesh: innerMeterMesh,
            radius: innerRadius,
            dlColor: innerDlColor,
            ulColor: innerUlColor,
        },

        dot: {
            color: "black",
            radius: outerRadius / 5,
            mesh: dotMesh,
        },

        dial: {
            color: meterObject.backgroundColor,
            mesh: dialMesh,
        },
    });

    // Meter progress bar creation.
    const barWidth = outerRadius;
    const barHeight = lineWidth / 2;

    const progressBar = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        progressBarObject.color,
    );
    const progressBarBackground = roundedRectangle(
        0,
        0,
        barWidth,
        barHeight,
        progressBarObject.backgroundColor,
    );
    const progressBarMesh = new Mesh(
        progressBarBackground,
        progressBar,
    ).translate(0, outerRadius / 1.5 - barHeight / 2);
    progressBarMesh.draw = function (ctx, t) {
        this.shapes[0].draw(ctx, 1);
        this.shapes[1].draw(ctx, t);
        return this;
    };

    progressBarObject = Object.assign(progressBarObject, {
        mesh: progressBarMesh,
    });
};

const speedtestOnUpdate = function (data) {
    speedtestData = data;
};

const speedtestOnEnd = function (aborted: boolean) {
    if (!aborted) {
        onend();
    }
};

let clientIp: any = ref("");
let ipInfo: any = ref({});
let lookedUpIp: any = ref({});

async function onload() {
    // @ts-ignore
    speedtestObject = new Speedtest();

    clientIp.value = await getIP();
    // clientIp.value = "152.26.175.192";

    ipInfo.value = await getIPInfo(clientIp.value);

    lookedUpIp.value = await lookupIP(clientIp.value);

    speedtestObject.setParameter("getIp_ispInfo", false);
    speedtestObject.setParameter("getIp_ispInfo_distance", false);

    speedtestObject.onupdate = speedtestOnUpdate;
    speedtestObject.onend = speedtestOnEnd;

    // Progress bar for the speedtest as a whole.
    // The progress bar object is for an individual state.
    createProgressBar(
        //@ts-expect-error
        $("#progress-bar"),
        [PROGRESS_BAR_GRADIENT],
        {
            styles: {
                "border-top-left-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-left-radius": BORDER_RADIUS_PRIMARY,
            },
        },
        {
            styles: {
                "border-top-right-radius": BORDER_RADIUS_PRIMARY,
                "border-bottom-right-radius": BORDER_RADIUS_PRIMARY,
            },
        },
    );
}

const toggleHidden = async function (
    el: IDollarElement & Element,
    duration = 1000,
) {
    const hidden = el.classList.contains("hidden");
    const height = el.clientHeight;

    const transformFunc = function (v: number, t: number) {
        t = hidden ? t : 0;
        el.css({ height: `${v}px`, opacity: t });
        return false;
    };

    if (!hidden) {
        const to = 0;
        const from = height;

        await smoothAnimate(to, from, duration, transformFunc, easeInCubic);
        el.classList.add("hidden");
    } else {
        el.classList.remove("hidden");
        const to = getOffset(el).height;
        const from = 0;

        await smoothAnimate(to, from, duration, transformFunc, easeOutCubic);
        el.css({ height: "auto" });
    }
};

const openingSlide = once(async function () {
    toggleHidden($("#start-pane"));

    [$(".speedtest-container"), $("#info-progress-container")].forEach((el) =>
        toggleHidden(el, 500),
    );

    openingAnimation(2000, easeInOutCubic);
});

const onstart = throttle(async function () {
    const startButton = $("#start-btn");
    const progressBarElement = <HTMLElement>$("#progress-bar");
    const meterUnitInfoElement = $(".speedtest-container .info-container");

    const start = async function () {
        startButton.classList.add("running");
        $(".text", startButton).innerHTML = "Stop";

        openingSlide();

        speedtestObject.start();
    };

    const abort = async function () {
        speedtestObject.abort();

        startButton.classList.remove("running");
        $(".text", startButton).innerHTML = "Start";

        updateTestState(true);
        openingAnimation(2000, easeInOutCubic);

        await sleep(500);

        setUnitElementInfo(
            { amount: BLANK, unit: BLANK, footer: "Waiting...", kind: BLANK },
            meterUnitInfoElement,
        );

        $$(".info-progress-container .unit-container").forEach((el) => {
            el.classList.add("in-progress");
            setUnitElementInfo({ amount: BLANK }, el);
        });

        animateProgressBar(
            progressBarElement,
            0,
            parseFloat(progressBarElement.getAttribute("percent-complete")) ||
                0,
            1000,
        );
    };

    if (speedtestObject.getState() === 3) {
        abort();
    } else if (speedtestObject.getState() === 5) {
        abort();
        start();
    } else {
        start();
    }
}, 750);

const onend = async function () {
    const startButton = $("#start-btn");
    // const speedtestContainer = $(".speedtest-container");
    // const completePane = $("#complete-pane");

    // const ip = String(speedtestData.clientIp).trim().split(" ")[0].trim();

    // const windowMessage: WindowMessage = {
    //     message: "complete",
    //     key: "password",
    //     data: {
    //         dlStatus: speedtestData.dlStatus,
    //         ulStatus: speedtestData.ulStatus,
    //         pingStatus: speedtestData.pingStatus,
    //         jitterStatus: speedtestData.jitterStatus,
    //         ip: ip,
    //     },
    // };

    // postMessage(eventObject, windowMessage);

    // startButton.classList.toggle("running");

    // await awaitHidden();

    // await closingAnimation(2000, easeInOutCubic);
    // await toggleHidden(speedtestContainer);

    // toggleHidden(completePane);
    $(".text", startButton).innerHTML = "Restart";
};

const gridBackground = ref<HTMLElement>(null);

onMounted(() => {
    const encodedSVG = encodeURIComponent(`
    <svg class="tmp" xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2 2'>
        <path d='M1 2V0h1v1H0v1z' fill-opacity='0.10'/>
    </svg>
`);

    gridBackground.value.style.backgroundImage = `url("data:image/svg+xml,${encodedSVG}")`;

    onload();
    animationLoopOnload();
    animationLoopOuter(animationLoopOnupdate, animationLoopOndraw);

    $(document.getElementById("start-btn")).on("click", function (ev) {
        const duration = 1000;

        rippleButton(
            <MouseEvent>ev,
            this,
            <HTMLElement>$(".ripple", this),
            15,
            0,
            duration,
        );

        const stateName = getSpeedtestStateName();

        // if (stateName !== "finished") {
        //     onstart();
        // } else {
        //     // speedtestObject = new Speedtest();

        //     updateTestState(true);

        onstart();
        // }
    });

    $(window).on("message", receiveMessage);
});

const byteAmount = ref(30000);
const clientUID = ref("");
const dnsResult: any = ref({});
const started = ref(false);

const startDNSSpeedtest = async function () {
    const dnsStartButton = $("#dns-start-btn");
    const dnsResultPane = $("#dns-result-pane");

    const start = async function () {
        if (!started.value) {
            toggleHidden($("#dns-start-pane"));
        }

        dnsStartButton.classList.add("running");
        $(".text", dnsStartButton).innerHTML = "Stop";

        const uid = Math.random().toString(36).substring(2);

        clientUID.value = uid;

        const url = `https://${uid}_${byteAmount.value}.dns.friday.institute`;

        try {
            const response = await fetch(url);
        } catch (e) {
            console.error(e);
        }

        dnsStartButton.classList.remove("running");
        $(".text", dnsStartButton).innerHTML = "Start";

        if (!started.value) {
            toggleHidden(dnsResultPane);
        }

        started.value = true;
    };

    if (dnsStartButton.classList.contains("running")) {
        dnsStartButton.classList.remove("running");
        $(".text", dnsStartButton).innerHTML = "Start";
    } else {
        start();
    }
};

const getDNSResult = async function (uid: string, attempts = 0) {
    const url = `https://ip.friday.institute/dns-results/${uid}`;

    let data;

    try {
        const response = await fetch(url);
        data = await response.json();

        if (data?.speedtest_dl_speed == null) {
            data = null;
        }
    } catch (e) {
        console.error(e);
    }

    // if the data is not ready, we should wait for a bit and try again
    if (!data || data?.status === "pending") {
        if (attempts < 10) {
            await sleep(1000);
            return getDNSResult(uid, attempts + 1);
        } else {
            throw new Error("Max attempts reached");
        }
    }

    return data;
};

// if the clientUID changes, we should query the server for the result
watch(clientUID, async (uid) => {
    if (uid) {
        dnsResult.value = await getDNSResult(uid);
    }
});

const getFormattedSpeed = function (speed: number) {
    if (speed < 1000) {
        return `${speed} Mbps`;
    } else {
        return `${(speed / 1000).toPrecision(3)} Gbps`;
    }
};
</script>

<style lang="scss">
.grid-background {
    background-size: 1rem !important;
    background-repeat: repeat;

    pointer-events: none;


    opacity: 0.2;
    // perspective: 900px;

    // transform:  rotate3d(-1, 1, 0, 30deg) rotateX(90deg)  ;
}
</style>
