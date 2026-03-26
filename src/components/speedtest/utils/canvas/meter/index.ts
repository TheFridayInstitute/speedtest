/**
 * Meter module — modular speedtest meter rendering.
 *
 * Barrel exports for config, rings, dial, and progress bar.
 */

export { PHI, computeMeterConfig, type MeterConfig } from "./config";
export { createRings, drawRings, type MeterRing, type RingSet } from "./rings";
export { createDial, drawDial, type DialState } from "./dial";
export { createProgressBar, drawProgressBar, type ProgressBarState } from "./progressBar";
