<template>
    <div class="relative w-full min-h-[240px] sm:min-h-[360px]">
        <div
            v-if="loading"
            class="absolute inset-0 z-10 flex items-center justify-center"
        >
            <div class="text-sm text-muted-foreground">Loading...</div>
        </div>
        <v-chart
            ref="chartRef"
            :option="chartOption"
            :theme="'speedtest'"
            :autoresize="true"
            class="h-full w-full min-h-[240px] sm:min-h-[360px]"
            @brushend="onBrushEnd"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useMediaQuery } from "@vueuse/core";
import { use } from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import {
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DataZoomComponent,
    BrushComponent,
    ToolboxComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import { useDashboardFilterStore } from "@src/stores/useDashboardFilterStore";
import { useEChartsTheme } from "../composables/useEChartsTheme";
import { CHART_COLORS, CHART_COLORS_RGBA, formatMetricValue } from "./chartMetrics";

// ── Tree-shake ECharts ────────────────────────────────────────────────

use([
    LineChart,
    BarChart,
    GridComponent,
    TooltipComponent,
    LegendComponent,
    DataZoomComponent,
    BrushComponent,
    ToolboxComponent,
    CanvasRenderer,
]);

// ── Theme ─────────────────────────────────────────────────────────────

const { registerTheme: registerSpeedtestTheme } = useEChartsTheme();
registerSpeedtestTheme();

// ── Props ─────────────────────────────────────────────────────────────

export interface TimeSeriesBucket {
    timestamp: string;
    download: { avg: number; count: number };
    upload: { avg: number; count: number };
    ping: { avg: number; count: number };
    jitter: { avg: number; count: number };
}

const props = withDefaults(
    defineProps<{
        buckets: TimeSeriesBucket[];
        loading?: boolean;
        compact?: boolean;
    }>(),
    {
        loading: false,
        compact: false,
    },
);

const isMobile = useMediaQuery("(max-width: 639px)");

// ── Store ─────────────────────────────────────────────────────────────

const filterStore = useDashboardFilterStore();

// ── Refs ──────────────────────────────────────────────────────────────

const chartRef = ref<InstanceType<typeof VChart> | null>(null);

// ── Chart option ──────────────────────────────────────────────────────

const chartOption = computed(() => {
    const downloadData = props.buckets.map((b) => [b.timestamp, b.download.avg]);
    const uploadData = props.buckets.map((b) => [b.timestamp, b.upload.avg]);
    const pingData = props.buckets.map((b) => [b.timestamp, b.ping.avg]);
    const jitterData = props.buckets.map((b) => [b.timestamp, b.jitter.avg]);

    // Show symbols when few data points so single-point series are visible
    const sparse = props.buckets.length <= 5;
    const symbolSize = sparse ? 8 : 4;
    const symbol = sparse ? "circle" : "none";

    const chartColors = CHART_COLORS;

    return {
        tooltip: {
            trigger: "axis" as const,
            axisPointer: {
                type: "cross" as const,
                label: { backgroundColor: "hsl(0 0% 20%)" },
            },
            formatter(params: any[]) {
                if (!Array.isArray(params) || params.length === 0) return "";
                const date = new Date(params[0].value[0]);
                const dateStr = date.toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                });
                let html = `<div style="font-weight:600;margin-bottom:4px">${dateStr}</div>`;
                for (const p of params) {
                    const val = p.value[1] as number;
                    const metric = (p.seriesName as string).toLowerCase();
                    const formatted = formatMetricValue(val, metric);
                    html += `<div style="display:flex;align-items:center;gap:6px">`;
                    html += `${p.marker}<span>${p.seriesName}:</span>`;
                    html += `<span style="font-weight:600">${formatted}</span></div>`;
                }
                return html;
            },
        },

        legend: {
            show: !isMobile.value,
            data: ["Download", "Upload", "Ping", "Jitter"],
            top: 0,
            right: 0,
            textStyle: { fontSize: 12 },
        },

        grid: {
            left: isMobile.value ? 40 : 60,
            right: isMobile.value ? 16 : 60,
            top: props.compact ? 20 : 40,
            bottom: props.compact ? 20 : 80,
            containLabel: false,
        },

        xAxis: {
            type: "time" as const,
            boundaryGap: false,
            axisLabel: {
                fontSize: 11,
            },
        },

        yAxis: [
            {
                type: "value" as const,
                name: "Speed (Mbps)",
                nameTextStyle: { fontSize: 11, padding: [0, 0, 0, 0] },
                axisLabel: {
                    fontSize: 11,
                    formatter: (v: number) => `${v.toFixed(0)}`,
                },
                splitLine: { show: true },
            },
            {
                type: "value" as const,
                name: "Latency (ms)",
                nameTextStyle: { fontSize: 11, padding: [0, 0, 0, 0] },
                axisLabel: {
                    fontSize: 11,
                    formatter: (v: number) => `${Math.round(v)}`,
                },
                splitLine: { show: false },
            },
        ],

        series: [
            {
                name: "Download",
                type: "line" as const,
                yAxisIndex: 0,
                data: downloadData,
                smooth: true,
                symbol,
                symbolSize,
                lineStyle: { width: 2, color: chartColors.download },
                itemStyle: { color: chartColors.download },
                areaStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: CHART_COLORS_RGBA.download.fill },
                            { offset: 1, color: CHART_COLORS_RGBA.download.fade },
                        ],
                    },
                },
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
            },
            {
                name: "Upload",
                type: "line" as const,
                yAxisIndex: 0,
                data: uploadData,
                smooth: true,
                symbol,
                symbolSize,
                lineStyle: { width: 2, color: chartColors.upload },
                itemStyle: { color: chartColors.upload },
                areaStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: CHART_COLORS_RGBA.upload.fill },
                            { offset: 1, color: CHART_COLORS_RGBA.upload.fade },
                        ],
                    },
                },
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
            },
            {
                name: "Ping",
                type: "line" as const,
                yAxisIndex: 1,
                data: pingData,
                smooth: true,
                symbol,
                symbolSize,
                lineStyle: { width: 2, color: chartColors.ping },
                itemStyle: { color: chartColors.ping },
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
            },
            {
                name: "Jitter",
                type: "line" as const,
                yAxisIndex: 1,
                data: jitterData,
                smooth: true,
                symbol,
                symbolSize,
                lineStyle: { width: 2, color: chartColors.jitter, type: "dashed" as const },
                itemStyle: { color: chartColors.jitter },
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
            },
        ],

        dataZoom: [
            {
                type: "slider" as const,
                show: !props.compact && !isMobile.value,
                xAxisIndex: 0,
                bottom: 10,
                height: 24,
                borderColor: "transparent",
                backgroundColor: "rgba(128,128,128,0.05)",
                fillerColor: CHART_COLORS_RGBA.download.fade,
                handleSize: "60%",
                handleStyle: {
                    borderColor: "rgba(128,128,128,0.4)",
                },
                textStyle: { fontSize: 10 },
            },
            {
                type: "inside" as const,
                xAxisIndex: 0,
            },
        ],

        toolbox: {
            show: false,
        },

        brush: {
            toolbox: ["lineX", "clear"],
            xAxisIndex: 0,
            brushStyle: {
                borderWidth: 1,
                color: CHART_COLORS_RGBA.download.fade,
                borderColor: CHART_COLORS_RGBA.download.fill,
            },
            outOfBrush: {
                colorAlpha: 0.3,
            },
        },

        animationDuration: 600,
        animationEasing: "cubicOut" as const,
    };
});

// ── Brush event handler ───────────────────────────────────────────────

function onBrushEnd(params: any): void {
    const areas = params?.areas;
    if (!areas || areas.length === 0) {
        filterStore.setFromChartBrush(null);
        return;
    }

    const area = areas[0];
    if (!area.coordRange || area.coordRange.length < 2) {
        filterStore.setFromChartBrush(null);
        return;
    }

    const [startMs, endMs] = area.coordRange as [number, number];
    const startDate = new Date(startMs).toISOString();
    const endDate = new Date(endMs).toISOString();

    filterStore.setFromChartBrush([startDate, endDate]);
}
</script>
