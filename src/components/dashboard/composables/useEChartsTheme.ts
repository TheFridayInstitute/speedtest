import { computed } from "vue";
import { registerTheme } from "echarts/core";

/**
 * Detect current dark/light mode and return appropriate theme colors.
 * Uses hex values for Canvas API compatibility — ECharts renders on <canvas>,
 * which does NOT support oklch(), oklab(), color-mix(), or CSS Color Level 4.
 */
function getThemeColors() {
    if (typeof document === "undefined") {
        return { foreground: "#1a1a1a", background: "#ffffff", muted: "#737373", border: "#e5e5e5" };
    }
    const isDark = document.documentElement.classList.contains("dark");
    return isDark
        ? { foreground: "#f5f5f5", background: "#0a0a0a", muted: "#a3a3a3", border: "#262626" }
        : { foreground: "#1a1a1a", background: "#ffffff", muted: "#737373", border: "#e5e5e5" };
}

/**
 * Generates an ECharts theme that matches the app's glass aesthetic.
 *
 * Uses static hex colors for all Canvas-rendered elements (gradients,
 * line styles, fill colors) because ECharts renders on <canvas> which
 * does NOT support oklch(), oklab(), color-mix(), or CSS Color Level 4.
 */
export function useEChartsTheme() {
    const theme = computed(() => {
        const { foreground, background, muted: mutedForeground, border } = getThemeColors();

        // Multi-series palette: static hex values for Canvas compatibility.
        // Do NOT read from CSS vars — they contain oklch() values which Canvas cannot parse.
        const colorPalette = [
            "#5B6BC0", // download — deep indigo
            "#26A69A", // upload — teal-emerald
            "#FFA726", // ping — warm amber
            "#EF5350", // jitter — soft coral
            "#7E57C2", // lavender
            "#D4A017", // gold
            "#DAB860", // accent
            "#06b6d4", // cyan
        ];

        return {
            color: colorPalette,

            backgroundColor: "transparent",

            textStyle: {
                fontFamily: "'Fira Code', monospace",
                color: foreground,
            },

            title: {
                textStyle: {
                    color: foreground,
                    fontFamily: "'Fira Code', monospace",
                },
                subtextStyle: {
                    color: mutedForeground,
                    fontFamily: "'Fira Code', monospace",
                },
            },

            legend: {
                textStyle: {
                    color: mutedForeground,
                    fontFamily: "'Fira Code', monospace",
                },
                pageTextStyle: {
                    color: mutedForeground,
                },
            },

            tooltip: {
                backgroundColor: background,
                borderColor: border,
                textStyle: {
                    color: foreground,
                    fontFamily: "'Fira Code', monospace",
                },
                extraCssText:
                    "backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); box-shadow: 0 4px 16px hsl(0 0% 0% / 0.1);",
            },

            grid: {
                borderColor: border,
            },

            categoryAxis: {
                axisLine: { lineStyle: { color: border } },
                axisTick: { lineStyle: { color: border } },
                axisLabel: { color: mutedForeground },
                splitLine: { lineStyle: { color: border, type: "dashed" as const } },
            },

            valueAxis: {
                axisLine: { lineStyle: { color: border } },
                axisTick: { lineStyle: { color: border } },
                axisLabel: { color: mutedForeground },
                splitLine: { lineStyle: { color: border, type: "dashed" as const } },
            },

            timeAxis: {
                axisLine: { lineStyle: { color: border } },
                axisTick: { lineStyle: { color: border } },
                axisLabel: { color: mutedForeground },
                splitLine: { lineStyle: { color: border, type: "dashed" as const } },
            },

            line: {
                smooth: true,
                symbolSize: 4,
                lineStyle: { width: 2 },
            },

            bar: {
                barBorderRadius: [4, 4, 0, 0],
            },

            dataZoom: {
                backgroundColor: "transparent",
                borderColor: border,
                fillerColor: "rgba(59, 130, 246, 0.08)",
                handleStyle: { color: mutedForeground },
                textStyle: { color: mutedForeground },
                dataBackground: {
                    lineStyle: { color: border },
                    areaStyle: { color: border },
                },
            },

            // Default animation configuration
            animationDuration: 600,
            animationEasing: "cubicOut",
            animationDurationUpdate: 400,
            animationEasingUpdate: "cubicOut",
        };
    });

    function registerSpeedtestTheme(): void {
        registerTheme("speedtest", theme.value);
    }

    return {
        theme,
        registerTheme: registerSpeedtestTheme,
    };
}
