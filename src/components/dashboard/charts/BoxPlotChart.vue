<template>
    <div class="relative w-full" :style="{ minHeight: '320px' }">
        <div
            v-if="loading"
            class="absolute inset-0 z-10 flex items-center justify-center"
        >
            <div class="text-sm text-muted-foreground">Loading...</div>
        </div>

        <div v-if="!data?.length && !loading" class="flex h-full min-h-[320px] items-center justify-center">
            <p class="text-sm text-muted-foreground">No box plot data</p>
        </div>

        <v-chart
            v-else-if="data?.length"
            :option="chartOption"
            :theme="'speedtest'"
            :autoresize="true"
            class="h-full w-full"
            style="min-height: 320px"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { use } from "echarts/core";
import { BoxplotChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import VChart from "vue-echarts";
import { useEChartsTheme } from "../composables/useEChartsTheme";
import { CHART_COLORS, METRIC_UNITS, isLatencyMetric } from "./chartMetrics";

// ── Tree-shake ECharts ────────────────────────────────────────────────

use([BoxplotChart, GridComponent, TooltipComponent, CanvasRenderer]);

// ── Theme ─────────────────────────────────────────────────────────────

const { registerTheme: registerSpeedtestTheme } = useEChartsTheme();
registerSpeedtestTheme();

// ── Types ─────────────────────────────────────────────────────────────

export interface BoxPlotItem {
    label: string;
    /** [min, q1, median, q3, max] */
    values: [number, number, number, number, number];
}

// ── Props ─────────────────────────────────────────────────────────────

const props = withDefaults(
    defineProps<{
        data: BoxPlotItem[];
        metric: string;
        loading?: boolean;
    }>(),
    {
        loading: false,
    },
);

// ── Metric config ─────────────────────────────────────────────────────

const metricColor = computed(() => CHART_COLORS[props.metric] ?? CHART_COLORS.download);
const metricUnit = computed(() => METRIC_UNITS[props.metric] ?? "");
const isLatency = computed(() => isLatencyMetric(props.metric));

// ── Formatting ────────────────────────────────────────────────────────

function fmtVal(v: number): string {
    return isLatency.value ? `${Math.round(v)}` : `${v.toFixed(1)}`;
}

// ── Chart option ──────────────────────────────────────────────────────

const chartOption = computed(() => {
    if (!props.data?.length) return {};

    const isHorizontal = props.data.length > 6;
    const labels = props.data.map((d) => d.label);
    const boxData = props.data.map((d) => d.values);
    const color = metricColor.value;

    const categoryAxis = {
        type: "category" as const,
        data: labels,
        axisLabel: {
            fontSize: 11,
            rotate: !isHorizontal && labels.length > 8 ? 30 : 0,
        },
    };

    const valueAxis = {
        type: "value" as const,
        name: metricUnit.value,
        nameTextStyle: { fontSize: 11 },
        axisLabel: {
            fontSize: 11,
            formatter: (v: number) => fmtVal(v),
        },
    };

    return {
        tooltip: {
            trigger: "item" as const,
            formatter(params: any) {
                const data = params.value as number[];
                if (!data || data.length < 5) return "";
                const name = params.name || "";
                return (
                    `<div style="font-weight:600;margin-bottom:4px">${name}</div>` +
                    `<div>Max: <strong>${fmtVal(data[4])} ${metricUnit.value}</strong></div>` +
                    `<div>Q3: <strong>${fmtVal(data[3])} ${metricUnit.value}</strong></div>` +
                    `<div>Median: <strong>${fmtVal(data[2])} ${metricUnit.value}</strong></div>` +
                    `<div>Q1: <strong>${fmtVal(data[1])} ${metricUnit.value}</strong></div>` +
                    `<div>Min: <strong>${fmtVal(data[0])} ${metricUnit.value}</strong></div>`
                );
            },
        },

        grid: {
            left: isHorizontal ? 80 : 50,
            right: 20,
            top: 20,
            bottom: isHorizontal ? 30 : 50,
            containLabel: false,
        },

        xAxis: isHorizontal ? valueAxis : categoryAxis,
        yAxis: isHorizontal ? categoryAxis : valueAxis,

        series: [
            {
                name: "Box Plot",
                type: "boxplot" as const,
                data: boxData,
                itemStyle: {
                    color: color + "22",
                    borderColor: color,
                    borderWidth: 2,
                },
                emphasis: {
                    itemStyle: {
                        color: color + "33",
                        borderColor: color,
                        borderWidth: 2.5,
                    },
                },
                animationDuration: 600,
                animationEasing: "cubicOut" as const,
            },
        ],

        animationDuration: 600,
        animationEasing: "cubicOut" as const,
    };
});
</script>
