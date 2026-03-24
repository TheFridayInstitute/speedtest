/** Describes an arc-shaped glass region in canvas-pixel space. */
export interface GlassRegion {
    cx: number;
    cy: number;
    radius: number;
    lineWidth: number;
    startAngle: number;
    endAngle: number;
    active: boolean;
}

/** Tuning knobs for the glass material. */
export interface GlassOptions {
    chromaticAberration?: number; // 0-1, strength of RGB split
    specularIntensity?: number;   // 0-1
    fresnelPower?: number;        // 1-5, rim glow falloff
    displacement?: number;        // 0-1, UV distortion
}
