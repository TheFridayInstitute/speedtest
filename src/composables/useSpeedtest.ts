import { ref, reactive, computed, onUnmounted } from "vue";
import type { Ref, ComputedRef } from "vue";
import {
    TestState,
    SpeedtestState,
    SPEEDTEST_STATE_MAP,
    SPEEDTEST_DATA_MAP,
} from "@src/types/speedtest";
import type {
    SpeedtestData,
    TestStateObject,
    UnitInfo,
} from "@src/types/speedtest";

import { stripTrailingZeros } from "@utils/utils";

// @ts-ignore — LibreSpeed is a plain JS module without type declarations.
import { Speedtest } from "@utils/librespeed/speedtest";

/**
 * Composable that manages the core LibreSpeed speedtest lifecycle.
 *
 * Encapsulates the Speedtest worker instance, reactive test data,
 * per-metric state tracking, and computed display values. Contains
 * NO DOM manipulation — purely reactive state management.
 */
/** Return type of useSpeedtest(), used for provide/inject typing. */
export type UseSpeedtestReturn = ReturnType<typeof useSpeedtest>;

export function useSpeedtest() {
    // ── Internal (non-exported) state ─────────────────────────────────

    /** The LibreSpeed Speedtest worker instance. Created by initialize(). */
    let speedtestObject: any = null;

    // ── Reactive state ────────────────────────────────────────────────

    /** Latest data payload received from the speedtest worker's onupdate callback. */
    const data: Ref<SpeedtestData | null> = ref(null);

    /** Per-metric state tracker (ping, download, upload) and overall previous state. */
    const testStates: TestStateObject = reactive<TestStateObject>({
        ping: TestState.notStarted,
        download: TestState.notStarted,
        upload: TestState.notStarted,
        prevState: SpeedtestState.notStarted,
    });

    /** Whether the speedtest is currently running (state 3 in LibreSpeed terms). */
    const isRunning: Ref<boolean> = ref(false);

    // ── Internal helpers ──────────────────────────────────────────────

    /**
     * Look up a numeric status value from the current worker data.
     *
     * @param stateName - One of "ping", "download", "upload".
     * @param kind - "Amount" for speed/latency values, "Progress" for 0-1 progress.
     * @returns The parsed numeric value, clamped to valid bounds, or 0 if unavailable.
     */
    function getSpeedtestStateAmount(
        stateName: string,
        kind: string = "Amount",
    ): number {
        if (data.value == null) {
            return 0;
        }

        const key = stateName + kind;
        const dataKey = SPEEDTEST_DATA_MAP[key];
        const raw = parseFloat(
            (data.value as unknown as Record<string, string>)[dataKey],
        );
        const upperBound = kind === "Amount" ? 99999 : 1;

        return Number.isNaN(raw) ? 0 : Math.min(Math.max(raw, 0), upperBound);
    }

    /**
     * Derive the current human-readable state name from the worker data.
     * The worker's testState is offset by +1 relative to our SpeedtestState enum.
     *
     * @returns The state name string (e.g. "download", "ping", "upload", "finished"),
     *          or undefined if no data is available yet.
     */
    function getSpeedtestStateName(): string | undefined {
        if (data.value == null) {
            return undefined;
        }
        return SPEEDTEST_STATE_MAP[data.value.testState + 1];
    }

    /**
     * Update the per-metric test states based on the current worker data.
     * Handles state transitions (notStarted -> started -> active -> finished)
     * and tracks the previous overall state.
     *
     * This function is PURELY reactive — it mutates only the testStates object
     * and does NOT perform any DOM manipulation.
     *
     * @param abort - If true, resets all metric states back to notStarted.
     */
    function updateTestState(abort: boolean = false): void {
        if (data.value == null) {
            return;
        }

        const testState: SpeedtestState =
            (data.value.testState + 1) as SpeedtestState;
        const testStateName = SPEEDTEST_STATE_MAP[testState];
        const prevTestStateName = SPEEDTEST_STATE_MAP[testStates.prevState];

        if (abort) {
            // Reset every metric back to notStarted.
            testStates.ping = TestState.notStarted;
            testStates.download = TestState.notStarted;
            testStates.upload = TestState.notStarted;
            testStates.prevState = SpeedtestState.notStarted;
            return;
        }

        if (
            testStates.prevState !== SpeedtestState.notStarted &&
            testState !== testStates.prevState
        ) {
            // A state transition occurred: mark the previous metric as finished.
            if (prevTestStateName && prevTestStateName in testStates) {
                testStates[prevTestStateName] = TestState.finished;
            }
            // Mark the new metric as started (if it's a real metric, not "finished").
            if (testStateName && testStateName in testStates) {
                testStates[testStateName] = TestState.started;
            }
            // When the overall test finishes, mark ALL metrics as finished.
            if (testState === SpeedtestState.finished) {
                testStates.ping = TestState.finished;
                testStates.download = TestState.finished;
                testStates.upload = TestState.finished;
            }
        } else {
            // Still within the same state: mark it as active.
            if (testStateName && testStateName in testStates) {
                testStates[testStateName] = TestState.active;
            }
        }

        testStates.prevState = testState;
    }

    // ── Computed display values ───────────────────────────────────────

    /** The current human-readable test state name (e.g. "download", "finished"). */
    const currentStateName: ComputedRef<string | undefined> = computed(() => {
        return getSpeedtestStateName();
    });

    /**
     * Build a UnitInfo object for a given metric, formatting the amount and unit.
     *
     * @param stateName - "ping", "download", or "upload".
     * @param stateAmount - Optional pre-computed amount; fetched from worker data if omitted.
     */
    function getStateUnitInfo(
        stateName: string,
        stateAmount?: number,
    ): UnitInfo {
        let amount =
            stateAmount ?? getSpeedtestStateAmount(stateName, "Amount");
        const unitInfo: UnitInfo = {};

        if (stateName === "download" || stateName === "upload") {
            if (amount < 1000) {
                unitInfo.unit = "Mbps";
            } else {
                unitInfo.unit = "Gbps";
                amount /= 1000;
            }
            unitInfo.amount = stripTrailingZeros(amount.toPrecision(3));
        } else if (stateName === "ping") {
            if (amount < 1000) {
                unitInfo.unit = "ms";
            } else {
                unitInfo.unit = "s";
                amount /= 1000;
            }
            unitInfo.amount = String(Math.round(amount));
        }

        return unitInfo;
    }

    /** Computed UnitInfo for the ping/latency metric. */
    const pingResult: ComputedRef<UnitInfo> = computed(() => {
        return getStateUnitInfo("ping");
    });

    /** Computed UnitInfo for the download metric. */
    const downloadResult: ComputedRef<UnitInfo> = computed(() => {
        return getStateUnitInfo("download");
    });

    /** Computed UnitInfo for the upload metric. */
    const uploadResult: ComputedRef<UnitInfo> = computed(() => {
        return getStateUnitInfo("upload");
    });

    // ── Lifecycle methods ─────────────────────────────────────────────

    /**
     * Create and configure the LibreSpeed Speedtest worker instance.
     * Sets the onupdate and onend callbacks. Must be called before start().
     *
     * @param onEnd - Optional callback invoked when the test ends. Receives
     *                a boolean indicating whether the test was aborted.
     */
    function initialize(onEnd?: (aborted: boolean) => void): void {
        speedtestObject = new Speedtest();

        // Set the worker URL to point to the assets directory.
        speedtestObject.setParameter("workerURL", "./assets/speedtest_worker.js");

        // Disable ISP info fetching from the worker — we handle that in useIPInfo.
        speedtestObject.setParameter("getIp_ispInfo", false);
        speedtestObject.setParameter("getIp_ispInfo_distance", false);

        speedtestObject.onupdate = (workerData: SpeedtestData) => {
            data.value = workerData;
            updateTestState();
        };

        speedtestObject.onend = (aborted: boolean) => {
            // Mark all metrics as finished on normal end
            if (!aborted) {
                testStates.ping = TestState.finished;
                testStates.download = TestState.finished;
                testStates.upload = TestState.finished;
            }
            isRunning.value = false;
            if (onEnd) {
                onEnd(aborted);
            }
        };

        console.log("Speedtest composable initialized.");
    }

    /**
     * Configure the server to test against. Must be called after initialize()
     * and before start(). Sets the server's URLs on the LibreSpeed instance
     * so the worker knows where to send requests.
     *
     * @param server - Server config with name, base URL, and endpoint paths.
     */
    function setServer(server: {
        name: string;
        server: string;
        dlURL: string;
        ulURL: string;
        pingURL: string;
        getIpURL: string;
    }): void {
        if (speedtestObject == null) {
            throw new Error(
                "Speedtest not initialized. Call initialize() first.",
            );
        }
        speedtestObject.addTestPoint(server);
        speedtestObject.setSelectedServer(server);
        console.log(`Speedtest server set: ${server.name} (${server.server})`);
    }

    /**
     * Start the speedtest. The worker begins cycling through ping, download,
     * and upload phases. Data will flow into the reactive `data` ref via the
     * onupdate callback.
     */
    function start(): void {
        if (speedtestObject == null) {
            throw new Error(
                "Speedtest not initialized. Call initialize() first.",
            );
        }
        // Reset all metric states for a fresh test
        testStates.ping = TestState.notStarted;
        testStates.download = TestState.notStarted;
        testStates.upload = TestState.notStarted;
        testStates.prevState = SpeedtestState.notStarted;
        data.value = null;

        isRunning.value = true;
        speedtestObject.start();
    }

    /**
     * Abort a running speedtest. Resets all per-metric states back to notStarted.
     */
    function abort(): void {
        if (speedtestObject == null) {
            return;
        }
        speedtestObject.abort();
        isRunning.value = false;
        updateTestState(true);
    }

    /**
     * Convenience method: abort any running test, then start a fresh one.
     */
    function restart(): void {
        abort();
        start();
    }

    /**
     * Format a speed value (in Mbps) into a human-readable string with unit.
     *
     * @param speed - Speed in Mbps.
     * @returns Formatted string, e.g. "123 Mbps" or "1.23 Gbps".
     */
    function getFormattedSpeed(speed: number): string {
        if (speed < 1000) {
            return `${speed} Mbps`;
        } else {
            return `${(speed / 1000).toPrecision(3)} Gbps`;
        }
    }

    /**
     * Returns the underlying LibreSpeed instance state (0-5).
     * Useful for checking whether the worker is idle, running, or finished.
     */
    function getState(): number {
        if (speedtestObject == null) {
            return 0;
        }
        return speedtestObject.getState();
    }

    // Clean up worker on unmount
    onUnmounted(() => {
        if (speedtestObject != null) {
            speedtestObject.abort();
        }
    });

    return {
        // ── Reactive state ──
        /** Latest data payload from the speedtest worker. */
        data,
        /** Per-metric state tracker. */
        testStates,
        /** Whether the speedtest is actively running. */
        isRunning,

        // ── Computed values ──
        /** Current human-readable state name (e.g. "download", "ping"). */
        currentStateName,
        /** Formatted ping result with amount and unit. */
        pingResult,
        /** Formatted download result with amount and unit. */
        downloadResult,
        /** Formatted upload result with amount and unit. */
        uploadResult,

        // ── Methods ──
        /** Create and configure the LibreSpeed worker instance. */
        initialize,
        /** Set the backend server to test against. */
        setServer,
        /** Start the speedtest. */
        start,
        /** Abort a running speedtest. */
        abort,
        /** Abort and restart the speedtest. */
        restart,
        /** Update per-metric state tracking from current worker data. */
        updateTestState,
        /** Get numeric state amount for a metric (internal helper, also exported for canvas). */
        getSpeedtestStateAmount,
        /** Get current state name from worker data (internal helper, also exported for canvas). */
        getSpeedtestStateName,
        /** Build a UnitInfo object for a given metric. */
        getStateUnitInfo,
        /** Format a speed value to a human-readable string with unit. */
        getFormattedSpeed,
        /** Get the raw LibreSpeed instance state number. */
        getState,
    };
}
