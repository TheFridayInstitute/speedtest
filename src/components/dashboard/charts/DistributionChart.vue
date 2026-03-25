<template>
    <div class="relative w-full" :style="{ minHeight: '320px' }">
        <div
            v-if="loading"
            class="absolute inset-0 z-10 flex items-center justify-center"
        >
            <div class="text-sm text-muted-foreground">Loading...</div>
        </div>

        <div v-if="!data && !loading" class="flex h-full min-h-[320px] items-center justify-center">
            <p class="text-sm text-muted-foreground">No distribution data</p>
        </div>

        <template v-else-if="data">
            <v-chart
                :option="chartOption"
                :theme="'speedtest'"
                :autoresize="true"
                class="h-full w-full"
                style="min-height: 320px"
            />

            <!-- Box plot summary floating card -->
            <div
                class="absolute right-3 top-3 rounded-lg border-2 border-border/50 bg-background/80 px-3 py-2 text-sm shadow-lg backdrop-blur-sm"
            >
                <div class="mb-1 font-semibold text-foreground">
                    {{ metricLabel }} Summary
                </div>
                <div class="space-y-0.5 text-muted-foreground">
                    <div class="flex justify-between gap-3">
                        <span>Mean:</span>
                        <span class="font-medium tabular-nums text-foreground">{{ formatValue(data.boxPlot.mean) }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span>Median:</span>
                        <span class="font-medium tabular-nums text-foreground">{{ formatValue(data.boxPlot.median) }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span>P10:</span>
                        <span class="font-medium tabular-nums text-foreground">{{ formatValue(data.boxPlot.p10) }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span>P25:</span>
                        <span class="font-medium tabular-nums text-foreground">{{ formatValue(data.boxPlot.p25) }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span>P75:</span>
                        <span class="font-medium tabular-nums text-foreground">{{ formatValue(data.boxPlot.p75) }}</span>
                    </div>
                    <div class="flex justify-between gap-3">
                        <span>P90:</span>
                        <span class="font-medium tabular-nums text-foreground">{{ formatValue(data.boxPlot.p90) }}</span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { use } from "echarts/core";
import { BarChart } from "echarts/charts";
import {
    GridComponent,
    TooltipComponent,
    MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import { useEChartsTheme } from "@src/composables/useEChartsTheme";

// ── Tree-shake ECharts ────────────────────────────────────────────────

use([BarChart, GridComponent, TooltipComponent, MarkLineComponent, CanvasRenderer]);

// ── Theme ─────────────────────────────────────────────────────────────

const { registerTheme: registerSpeedtestTheme } = useEChartsTheme();
registerSpeedtestTheme();

// ── Types ─────────────────────────────────────────────────────────────

export interface DistributionData {
    histogram: { min: number; max: number; count: number }[];
    boxPlot: {
        p10: number;
        p25: number;
        median: number;
        p75: number;
        p90: number;
        mean: number;
    };
}

// ── Props ─────────────────────────────────────────────────────────────

const props = withDefaults(
    defineProps<{
        data: DistributionData | null;
        metric: string;
        loading?: boolean;
    }>(),
    {
        loading: false,
    },
);

// ── Metric config ─────────────────────────────────────────────────────

// Static hex colors for Canvas API compatibility — ECharts renders on <canvas>,
// which does NOT support oklch(), oklab(), color-mix(), or any CSS Color Level 4
// functions in gradient colorStops. Must use hex or rgb()/rgba() only.
const CHART_COLORS: Record<string, string> = {
    download: "#5B6BC0",
    upload: "#26A69A",
    ping: "#FFA726",
    jitter: "#EF5350",
    all: "#5B6BC0",
};

const METRIC_COLORS: Record<string, string> = CHART_COLORS;

const METRIC_UNITS: Record<string, string> = {
    download: "Mbps",
    upload: "Mbps",
    ping: "ms",
    jitter: "ms",
};

const METRIC_LABELS: Record<string, string> = {
    download: "Download",
    upload: "Upload",
    ping: "Ping",
    jitter: "Jitter",
};

const metricColor = computed(() => METRIC_COLORS[props.metric] ?? "#3b82f6");
const metricUnit = computed(() => METRIC_UNITS[props.metric] ?? "");
const metricLabel = computed(() => METRIC_LABELS[props.metric] ?? props.metric);
const isLatency = computed(() => props.metric === "ping" || props.metric === "jitter");

// ── Formatting ────────────────────────────────────────────────────────

function formatValue(v: number): string {
    return `${Math.round(v)} ${metricUnit.value}`;
}

// ── Chart option ──────────────────────────────────────────────────────

const chartOption = computed(() => {
    if (!props.data) return {};

    const bins = props.data.histogram;
    const bp = props.data.boxPlot;
    const color = metricColor.value;

    const categories = bins.map(
        (b) =>
            `${Math.round(b.min)}-${Math.round(b.max)}`,
    );
    const counts = bins.map((b) => b.count);

    return {
        tooltip: {
            trigger: "axis" as const,
            axisPointer: { type: "shadow" as const },
            formatter(params: any) {
                const p = Array.isArray(params) ? params[0] : params;
                if (!p) return "";
                const bin = bins[p.dataIndex];
                if (!bin) return "";
                const rangeStr = `${Math.round(bin.min)} - ${Math.round(bin.max)} ${metricUnit.value}`;
                return `<div style="font-weight:600;margin-bottom:4px">${rangeStr}</div>` +
                    `<div>Count: <strong>${bin.count.toLocaleString()}</strong></div>`;
            },
        },

        grid: {
            left: 50,
            right: 20,
            top: 20,
            bottom: 50,
            containLabel: false,
        },

        xAxis: {
            type: "category" as const,
            data: categories,
            axisLabel: {
                fontSize: 10,
                rotate: bins.length > 12 ? 45 : 0,
                interval: bins.length > 20 ? Math.floor(bins.length / 10) : 0,
            },
            name: metricUnit.value,
            nameLocation: "middle" as const,
            nameGap: 35,
            nameTextStyle: { fontSize: 11 },
        },

        yAxis: {
            type: "value" as const,
            name: "Count",
            nameTextStyle: { fontSize: 11 },
            axisLabel: {
                fontSize: 11,
                formatter: (v: number) =>
                    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`,
            },
        },

        series: [
            {
                type: "bar" as const,
                data: counts,
                itemStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: color + "D9" },
                            { offset: 1, color: color + "8C" },
                        ],
                    },
                    borderRadius: [4, 4, 0, 0],
                },
                barMaxWidth: 40,
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
                markLine: {
                    silent: true,
                    symbol: "none",
                    lineStyle: { width: 2 },
                    label: {
                        fontSize: 11,
                        fontWeight: "bold",
                        backgroundColor: "rgba(255,255,255,0.85)",
                        padding: [2, 6],
                        borderRadius: 3,
                        formatter: (p: any) => p.name,
                    },
                    data: [
                        {
                            name: `Mean: ${Math.round(bp.mean)}`,
                            xAxis: findBinIndex(bins, bp.mean),
                            lineStyle: { color: "rgba(128, 128, 128, 0.7)", width: 3, type: "dashed" as const },
                            label: { position: "insideEndTop" as const },
                        },
                        {
                            name: `Median: ${Math.round(bp.median)}`,
                            xAxis: findBinIndex(bins, bp.median),
                            lineStyle: { color: "rgba(128, 128, 128, 0.7)", width: 3, type: "solid" as const },
                            label: { position: "insideEndTop" as const },
                        },
                        {
                            name: `P10: ${Math.round(bp.p10)}`,
                            xAxis: findBinIndex(bins, bp.p10),
                            lineStyle: { color: "rgba(128, 128, 128, 0.7)", width: 2, type: "dotted" as const },
                            label: { position: "insideEndTop" as const },
                        },
                        {
                            name: `P90: ${Math.round(bp.p90)}`,
                            xAxis: findBinIndex(bins, bp.p90),
                            lineStyle: { color: "rgba(128, 128, 128, 0.7)", width: 2, type: "dotted" as const },
                            label: { position: "insideEndTop" as const },
                        },
                    ],
                },
            },
        ],

        animationDuration: 600,
        animationEasing: "cubicOut" as const,
    };
});

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Find the closest bin index for a given value (for markLine placement).
 */
function findBinIndex(
    bins: { min: number; max: number; count: number }[],
    value: number,
): number {
    for (let i = 0; i < bins.length; i++) {
        if (value >= bins[i].min && value <= bins[i].max) return i;
    }
    // Fallback: find nearest
    let closestIdx = 0;
    let closestDist = Infinity;
    for (let i = 0; i < bins.length; i++) {
        const mid = (bins[i].min + bins[i].max) / 2;
        const dist = Math.abs(mid - value);
        if (dist < closestDist) {
            closestDist = dist;
            closestIdx = i;
        }
    }
    return closestIdx;
}
</script>
