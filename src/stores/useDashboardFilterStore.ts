import { defineStore } from "pinia";
import { ref, computed } from "vue";

export type TimeInterval = "hourly" | "daily" | "weekly" | "monthly";
export type DashboardMetric = "download" | "upload" | "ping" | "jitter";

export const useDashboardFilterStore = defineStore("dashboardFilters", () => {
    // ── Time ─────────────────────────────────────────────────────────
    const dateFrom = ref<string | null>(null);
    const dateTo = ref<string | null>(null);
    const timeInterval = ref<TimeInterval>("daily");

    // ── Classification ───────────────────────────────────────────────
    const testType = ref<string | null>(null);
    const flow = ref<string | null>(null);
    const entityId = ref<string | null>(null);
    const psuId = ref<string | null>(null);
    const provider = ref<string | null>(null);

    // ── Geo (from map selection) ─────────────────────────────────────
    const selectedH3Cells = ref<string[]>([]);
    const mapBounds = ref<[number, number, number, number] | null>(null);

    // ── Chart brush ──────────────────────────────────────────────────
    const brushedTimeRange = ref<[string, string] | null>(null);

    // ── Active metric ────────────────────────────────────────────────
    const activeMetric = ref<DashboardMetric>("download");

    // ── Derived ──────────────────────────────────────────────────────

    /** Effective date range: brush takes precedence over manual date pickers. */
    const effectiveDateRange = computed<{ from: string | null; to: string | null }>(() => {
        if (brushedTimeRange.value) {
            return { from: brushedTimeRange.value[0], to: brushedTimeRange.value[1] };
        }
        return { from: dateFrom.value, to: dateTo.value };
    });

    /** Serialize current filter state to URL search params for API calls. */
    const apiQueryParams = computed(() => {
        const params = new URLSearchParams();
        const range = effectiveDateRange.value;

        if (range.from) params.set("dateFrom", range.from);
        if (range.to) params.set("dateTo", range.to);
        if (timeInterval.value !== "daily") params.set("interval", timeInterval.value);
        if (testType.value) params.set("testType", testType.value);
        if (flow.value) params.set("flow", flow.value);
        if (entityId.value) params.set("entityId", entityId.value);
        if (psuId.value) params.set("psuId", psuId.value);
        if (provider.value) params.set("provider", provider.value);
        if (selectedH3Cells.value.length > 0) {
            params.set("h3Cells", selectedH3Cells.value.join(","));
        }
        if (activeMetric.value !== "download") {
            params.set("metric", activeMetric.value);
        }

        return params;
    });

    /** Whether any filters are active (for "clear all" button visibility). */
    const hasActiveFilters = computed(() => {
        return !!(
            dateFrom.value ||
            dateTo.value ||
            testType.value ||
            flow.value ||
            entityId.value ||
            psuId.value ||
            provider.value ||
            selectedH3Cells.value.length > 0 ||
            brushedTimeRange.value
        );
    });

    // ── Actions ──────────────────────────────────────────────────────

    function setFromMapSelection(h3Cells: string[]) {
        selectedH3Cells.value = h3Cells;
    }

    function addToMapSelection(h3Cell: string) {
        if (!selectedH3Cells.value.includes(h3Cell)) {
            selectedH3Cells.value = [...selectedH3Cells.value, h3Cell];
        }
    }

    function removeFromMapSelection(h3Cell: string) {
        selectedH3Cells.value = selectedH3Cells.value.filter((c) => c !== h3Cell);
    }

    function setFromChartBrush(range: [string, string] | null) {
        brushedTimeRange.value = range;
    }

    function reset() {
        dateFrom.value = null;
        dateTo.value = null;
        timeInterval.value = "daily";
        testType.value = null;
        flow.value = null;
        entityId.value = null;
        psuId.value = null;
        provider.value = null;
        selectedH3Cells.value = [];
        mapBounds.value = null;
        brushedTimeRange.value = null;
        activeMetric.value = "download";
    }

    return {
        // State
        dateFrom,
        dateTo,
        timeInterval,
        testType,
        flow,
        entityId,
        psuId,
        provider,
        selectedH3Cells,
        mapBounds,
        brushedTimeRange,
        activeMetric,

        // Computed
        effectiveDateRange,
        apiQueryParams,
        hasActiveFilters,

        // Actions
        setFromMapSelection,
        addToMapSelection,
        removeFromMapSelection,
        setFromChartBrush,
        reset,
    };
});
