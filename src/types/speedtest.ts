/** Canvas color type alias (will be imported from canvas module after Phase 2). */
export type CanvasColor = string | CanvasGradient | CanvasPattern;

/** States for individual test metric tracking (ping, download, upload). */
export enum TestState {
    notStarted = 0,
    started = 1,
    active = 2,
    finished = 3,
    drawFinished = 4,
}

/** Overall speedtest state machine states. */
export enum SpeedtestState {
    notStarted = 0,
    started = 1,
    download = 2,
    ping = 3,
    upload = 4,
    finished = 5,
    aborted = 6,
}

/** Maps numeric speedtest state to human-readable name. */
export const SPEEDTEST_STATE_MAP: Record<number, string> = Object.freeze({
    0: "notStarted",
    1: "started",
    2: "download",
    3: "ping",
    4: "upload",
    5: "finished",
    6: "aborted",
});

/** Maps display field names to worker data keys. */
export const SPEEDTEST_DATA_MAP: Record<string, string> = Object.freeze({
    pingAmount: "pingStatus",
    downloadAmount: "dlStatus",
    uploadAmount: "ulStatus",
    pingProgress: "pingProgress",
    downloadProgress: "dlProgress",
    uploadProgress: "ulProgress",
});

/** Data payload from the speedtest worker on each status update. */
export interface SpeedtestData {
    testState: number;
    dlStatus: string;
    ulStatus: string;
    pingStatus: string;
    jitterStatus: string;
    dlProgress: string;
    ulProgress: string;
    pingProgress: string;
    clientIp: string;
    testId?: string | null;
}

/** Per-metric test state tracker. */
export interface TestStateObject {
    ping: TestState;
    download: TestState;
    upload: TestState;
    prevState: SpeedtestState;
    [key: string]: TestState | SpeedtestState;
}

/** Display information for a single test metric. */
export interface UnitInfo {
    amount?: string;
    unit?: string;
    kind?: string;
    header?: string;
    footer?: string;
}

/** Canvas meter configuration with inner/outer rings, dial, and dot. */
export interface MeterObject {
    startAngle: number;
    endAngle: number;
    minValue: number;
    maxValue: number;
    lineWidth: number;
    backgroundColor: CanvasColor;

    outerMeter?: {
        mesh: any;
        radius: number;
        dlColor: CanvasColor;
        ulColor: CanvasColor;
    };

    innerMeter?: {
        mesh: any;
        radius: number;
        dlColor: CanvasColor;
        ulColor: CanvasColor;
    };

    dial?: {
        color: CanvasColor;
        mesh: any;
    };

    dot?: {
        color: CanvasColor;
        mesh: any;
        radius: number;
    };
}

/** Progress bar mesh and colors. */
export interface ProgressBarObject {
    mesh?: any;
    color: CanvasColor;
    backgroundColor: CanvasColor;
}

/** Message structure for iframe postMessage communication. */
export interface WindowMessage {
    message: "start" | "complete" | "next";
    key: string;
    data: Record<string, string>;
}
