/**
 * Centralized chart metric configuration.
 *
 * ECharts renders on Canvas which can't resolve oklch/color-mix, so we keep
 * hex fallbacks here for all chart components that need Canvas-safe colors.
 * The canonical oklch tokens live in styles/tokens.css (--chart-*).
 */

export const CHART_COLORS: Record<string, string> = {
    download: "#5B6BC0",
    upload: "#26A69A",
    ping: "#FFA726",
    jitter: "#EF5350",
};

export const CHART_COLORS_RGBA = {
    download: { fill: "rgba(91, 107, 192, 0.25)", fade: "rgba(91, 107, 192, 0.02)" },
    upload: { fill: "rgba(38, 166, 154, 0.25)", fade: "rgba(38, 166, 154, 0.02)" },
    ping: { fill: "rgba(255, 167, 38, 0.25)", fade: "rgba(255, 167, 38, 0.02)" },
    jitter: { fill: "rgba(239, 83, 80, 0.25)", fade: "rgba(239, 83, 80, 0.02)" },
} as const;

export const METRIC_LABELS: Record<string, string> = {
    download: "Download",
    upload: "Upload",
    ping: "Ping",
    jitter: "Jitter",
};

export const METRIC_UNITS: Record<string, string> = {
    download: "Mbps",
    upload: "Mbps",
    ping: "ms",
    jitter: "ms",
};

export function isLatencyMetric(metric: string): boolean {
    return metric === "ping" || metric === "jitter";
}

export function formatMetricValue(value: number, metric: string): string {
    const unit = METRIC_UNITS[metric] ?? "";
    return `${Math.round(value)} ${unit}`;
}
