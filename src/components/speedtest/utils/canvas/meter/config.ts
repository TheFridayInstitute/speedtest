/**
 * Meter geometry — 2 rings with golden-ratio proportions.
 */

import { emToPixels } from "@utils/utils";

export const PHI = 1.618033988749;

export interface MeterConfig {
    startAngle: number;
    endAngle: number;
    minValue: number;
    maxValue: number;
    outerLineWidth: number;
    innerLineWidth: number;
    gap: number;
    outerRadius: number;
    innerRadius: number;
    dialLength: number;
    dialWidth: number;
    dotRadius: number;
    barWidth: number;
    barHeight: number;
    barY: number;
    canvasWidth: number;
    canvasHeight: number;
    originX: number;
    originY: number;
    dpr: number;
}

export function computeMeterConfig(
    cssWidth: number,
    cssHeight: number,
    dpr: number,
    fontSize: string,
): MeterConfig {
    const startAngle = Math.PI * 0.8;
    const endAngle = 2 * Math.PI * 1.1;

    const w = cssWidth * dpr;
    const h = cssHeight * dpr;

    const outerLineWidth = 3 * emToPixels(fontSize) * dpr;
    const innerLineWidth = outerLineWidth / PHI;
    const gap = outerLineWidth / PHI;

    const outerRadius = w / 2 - outerLineWidth / 2;
    const innerRadius = outerRadius - outerLineWidth / 2 - gap - innerLineWidth / 2;

    const dialLength = innerRadius * 0.7;
    const dialWidth = outerLineWidth / 3;
    const dotRadius = outerLineWidth / 12;

    const leftX = Math.cos(startAngle) * outerRadius;
    const rightX = Math.cos(endAngle) * outerRadius;
    const barWidth = Math.abs(rightX - leftX);
    const barHeight = outerLineWidth / 2.5;
    const barY = Math.sin(startAngle) * outerRadius + outerLineWidth * 1.2;

    return {
        startAngle, endAngle, minValue: 0, maxValue: 100,
        outerLineWidth, innerLineWidth, gap,
        outerRadius, innerRadius,
        dialLength, dialWidth, dotRadius,
        barWidth, barHeight, barY,
        canvasWidth: w, canvasHeight: h,
        originX: w / 2, originY: h / 2, dpr,
    };
}
