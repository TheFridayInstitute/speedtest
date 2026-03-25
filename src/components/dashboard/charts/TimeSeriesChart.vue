<template>
    <div class="relative w-full" :style="{ minHeight: '360px' }">
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
            class="h-full w-full"
            style="min-height: 360px"
            @brushend="onBrushEnd"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
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
import { useEChartsTheme } from "@src/composables/useEChartsTheme";

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
    }>(),
    {
        loading: false,
    },
);

// ── Store ─────────────────────────────────────────────────────────────

const filterStore = useDashboardFilterStore();

// ── Refs ──────────────────────────────────────────────────────────────

const chartRef = ref<InstanceType<typeof VChart> | null>(null);

// ── Chart option ──────────────────────────────────────────────────────

const chartOption = computed(() => {
    const timestamps = props.buckets.map((b) => b.timestamp);
    const downloadData = props.buckets.map((b) => [b.timestamp, b.download.avg]);
    const uploadData = props.buckets.map((b) => [b.timestamp, b.upload.avg]);
    const pingData = props.buckets.map((b) => [b.timestamp, b.ping.avg]);
    const jitterData = props.buckets.map((b) => [b.timestamp, b.jitter.avg]);

    // Chart colors — use hex values for Canvas API compatibility (ECharts renders on Canvas,
    // which doesn't support oklch/color-mix in gradient colorStops)
    const chartColors = {
        download: "#5B6BC0",  // deep indigo
        upload: "#26A69A",    // teal-emerald
        ping: "#FFA726",      // warm amber
        jitter: "#EF5350",    // soft coral
    };

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
                    const isLatency =
                        p.seriesName === "Ping" || p.seriesName === "Jitter";
                    const formatted = isLatency
                        ? `${Math.round(val)} ms`
                        : `${Math.round(val)} Mbps`;
                    html += `<div style="display:flex;align-items:center;gap:6px">`;
                    html += `${p.marker}<span>${p.seriesName}:</span>`;
                    html += `<span style="font-weight:600">${formatted}</span></div>`;
                }
                return html;
            },
        },

        legend: {
            data: ["Download", "Upload", "Ping", "Jitter"],
            top: 0,
            right: 0,
            textStyle: { fontSize: 12 },
        },

        grid: {
            left: 60,
            right: 60,
            top: 40,
            bottom: 80,
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
                symbol: "none",
                lineStyle: { width: 2, color: chartColors.download },
                itemStyle: { color: chartColors.download },
                areaStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(91, 107, 192, 0.25)" },
                            { offset: 1, color: "rgba(91, 107, 192, 0.02)" },
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
                symbol: "none",
                lineStyle: { width: 2, color: chartColors.upload },
                itemStyle: { color: chartColors.upload },
                areaStyle: {
                    color: {
                        type: "linear" as const,
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                            { offset: 0, color: "rgba(38, 166, 154, 0.25)" },
                            { offset: 1, color: "rgba(38, 166, 154, 0.02)" },
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
                symbol: "none",
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
                symbol: "none",
                lineStyle: { width: 2, color: chartColors.jitter, type: "dashed" as const },
                itemStyle: { color: chartColors.jitter },
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
            },
        ],

        dataZoom: [
            {
                type: "slider" as const,
                xAxisIndex: 0,
                bottom: 10,
                height: 24,
                borderColor: "transparent",
                backgroundColor: "rgba(128,128,128,0.05)",
                fillerColor: "rgba(91, 107, 192, 0.08)",
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
                color: "rgba(91, 107, 192, 0.10)",
                borderColor: "rgba(91, 107, 192, 0.40)",
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
