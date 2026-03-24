/**
 * GlassOverlay — a reusable WebGL-powered glass refraction effect.
 *
 * Place a transparent `<canvas>` on top of your content canvas, hand both to
 * this class, call `render()` each frame and the overlay canvas will display
 * a glass-like distortion over the specified arc regions.
 *
 * Usage:
 * ```ts
 * const glass = new GlassOverlay(sourceCanvas, overlayCanvas, {
 *     chromaticAberration: 0.5,
 * });
 * glass.setRegions([{ cx: 200, cy: 200, radius: 100, lineWidth: 20,
 *                      startAngle: 0, endAngle: Math.PI, active: true }]);
 * function loop() {
 *     // ...draw to sourceCanvas...
 *     glass.render();
 *     requestAnimationFrame(loop);
 * }
 * loop();
 * ```
 */

import { VERTEX_SOURCE, FRAGMENT_SOURCE } from "./shaders";

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

import type { GlassRegion, GlassOptions } from "./types";
export type { GlassRegion, GlassOptions };

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: Required<GlassOptions> = {
    chromaticAberration: 0.5,
    specularIntensity: 0.4,
    fresnelPower: 2.5,
    displacement: 0.3,
};

// Names of every uniform we need to locate once and reuse per frame.
const UNIFORM_NAMES = [
    "uSource",
    "uResolution",
    "uTime",
    "uChromaticAberration",
    "uSpecularIntensity",
    "uFresnelPower",
    "uDisplacement",
    // Arc 0
    "uArc0Center",
    "uArc0Radius",
    "uArc0Width",
    "uArc0Start",
    "uArc0End",
    "uArc0Active",
    // Arc 1
    "uArc1Center",
    "uArc1Radius",
    "uArc1Width",
    "uArc1Start",
    "uArc1End",
    "uArc1Active",
] as const;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class GlassOverlay {
    private gl: WebGLRenderingContext | null = null;
    private program: WebGLProgram | null = null;
    private texture: WebGLTexture | null = null;
    private vertexBuffer: WebGLBuffer | null = null;

    private sourceCanvas: HTMLCanvasElement;
    private overlayCanvas: HTMLCanvasElement;

    private regions: GlassRegion[] = [];
    private options: Required<GlassOptions>;

    /** Cached uniform locations keyed by name. */
    private uniformLocations: Record<string, WebGLUniformLocation | null> = {};

    // -----------------------------------------------------------------------
    // Construction
    // -----------------------------------------------------------------------

    constructor(
        source: HTMLCanvasElement,
        overlay: HTMLCanvasElement,
        options?: GlassOptions,
    ) {
        this.sourceCanvas = source;
        this.overlayCanvas = overlay;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.init();
    }

    // -----------------------------------------------------------------------
    // Initialisation
    // -----------------------------------------------------------------------

    /** Bootstrap the WebGL context, compile shaders and prepare geometry. */
    private init(): boolean {
        const gl = this.overlayCanvas.getContext("webgl", {
            premultipliedAlpha: false,
            alpha: true,
        });
        if (!gl) {
            console.warn("GlassOverlay: WebGL not available.");
            return false;
        }
        this.gl = gl;

        // ---- Compile & link program ----------------------------------------
        const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SOURCE);
        const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
        if (!vs || !fs) return false;

        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.bindAttribLocation(program, 0, "aPosition");
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(
                "GlassOverlay: program link failed:",
                gl.getProgramInfoLog(program),
            );
            return false;
        }
        this.program = program;

        // Shaders are attached to the program — safe to delete the individual
        // shader objects now (they stay alive while the program exists).
        gl.deleteShader(vs);
        gl.deleteShader(fs);

        // ---- Fullscreen quad geometry (2 triangles, 6 vertices) ------------
        // prettier-ignore
        const quadVerts = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1,
        ]);
        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

        // ---- Texture for the source canvas ---------------------------------
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        // NEAREST filtering — we want a pixel-perfect copy, not blurred.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        // Clamp to edge to avoid border artefacts.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // ---- Cache uniform locations ---------------------------------------
        this.cacheUniforms();

        return true;
    }

    /** Compile a single shader stage, logging errors on failure. */
    private compileShader(type: number, source: string): WebGLShader | null {
        const gl = this.gl!;
        const shader = gl.createShader(type);
        if (!shader) return null;

        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const label = type === gl.VERTEX_SHADER ? "vertex" : "fragment";
            console.error(
                `GlassOverlay: ${label} shader compile failed:\n`,
                gl.getShaderInfoLog(shader),
            );
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    /** Look up and store every uniform location once. */
    private cacheUniforms(): void {
        const gl = this.gl!;
        const program = this.program!;
        for (const name of UNIFORM_NAMES) {
            this.uniformLocations[name] = gl.getUniformLocation(program, name);
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Define the arc regions that will receive the glass effect.
     * At most the first 2 regions are used (shader limitation).
     */
    setRegions(regions: GlassRegion[]): void {
        this.regions = regions.slice(0, 2);
    }

    /**
     * Render a single frame.
     *
     * Call this after you have drawn into the source canvas so the overlay
     * picks up the latest content.
     */
    render(): void {
        const gl = this.gl;
        if (!gl || !this.program) return;

        const w = this.overlayCanvas.width;
        const h = this.overlayCanvas.height;
        if (w === 0 || h === 0) return;

        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(this.program);

        // ---- Upload source canvas as texture -------------------------------
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            this.sourceCanvas,
        );
        gl.uniform1i(this.uniformLocations["uSource"]!, 0);

        // ---- Global uniforms -----------------------------------------------
        gl.uniform2f(this.uniformLocations["uResolution"]!, w, h);
        gl.uniform1f(
            this.uniformLocations["uTime"]!,
            performance.now() / 1000,
        );
        gl.uniform1f(
            this.uniformLocations["uChromaticAberration"]!,
            this.options.chromaticAberration,
        );
        gl.uniform1f(
            this.uniformLocations["uSpecularIntensity"]!,
            this.options.specularIntensity,
        );
        gl.uniform1f(
            this.uniformLocations["uFresnelPower"]!,
            this.options.fresnelPower,
        );
        gl.uniform1f(
            this.uniformLocations["uDisplacement"]!,
            this.options.displacement,
        );

        // ---- Per-arc uniforms (normalised to [0,1]) ------------------------
        this.setArcUniforms(0);
        this.setArcUniforms(1);

        // ---- Draw fullscreen quad ------------------------------------------
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    /** Resize the overlay canvas to match the source canvas dimensions. */
    resize(): void {
        this.overlayCanvas.width = this.sourceCanvas.width;
        this.overlayCanvas.height = this.sourceCanvas.height;
        if (this.gl) {
            this.gl.viewport(
                0,
                0,
                this.overlayCanvas.width,
                this.overlayCanvas.height,
            );
        }
    }

    /** Release all WebGL resources. Safe to call multiple times. */
    dispose(): void {
        const gl = this.gl;
        if (!gl) return;

        if (this.texture) {
            gl.deleteTexture(this.texture);
            this.texture = null;
        }
        if (this.vertexBuffer) {
            gl.deleteBuffer(this.vertexBuffer);
            this.vertexBuffer = null;
        }
        if (this.program) {
            gl.deleteProgram(this.program);
            this.program = null;
        }

        // Signal the browser it can reclaim the context immediately.
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();

        this.gl = null;
    }

    /** Quick feature-detection: can the current browser create a WebGL context? */
    static isSupported(): boolean {
        try {
            const c = document.createElement("canvas");
            const ctx =
                c.getContext("webgl") ||
                c.getContext("experimental-webgl");
            if (ctx) {
                // Clean up the throwaway context.
                const ext = (ctx as WebGLRenderingContext).getExtension(
                    "WEBGL_lose_context",
                );
                if (ext) ext.loseContext();
            }
            return !!ctx;
        } catch {
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    /**
     * Push the uniform values for a single arc slot (0 or 1).
     * Values are normalised from canvas pixels to the [0,1] UV range.
     */
    private setArcUniforms(index: number): void {
        const gl = this.gl!;
        const prefix = `uArc${index}` as const;
        const region: GlassRegion | undefined = this.regions[index];

        if (!region || !region.active) {
            gl.uniform1f(this.uniformLocations[`${prefix}Active`]!, 0.0);
            return;
        }

        const w = this.overlayCanvas.width;
        const h = this.overlayCanvas.height;

        // Normalise pixel values to [0,1] UV space.
        // Y is flipped: canvas pixel Y=0 is top, but UV Y=0 is bottom in the
        // shader (we mapped clip-space to UV with  vUV = aPosition * 0.5 + 0.5 ).
        gl.uniform2f(
            this.uniformLocations[`${prefix}Center`]!,
            region.cx / w,
            1.0 - region.cy / h,
        );
        // Radius and width are normalised by height so circles stay circular
        // (the shader applies its own aspect correction on the X axis).
        gl.uniform1f(
            this.uniformLocations[`${prefix}Radius`]!,
            region.radius / h,
        );
        gl.uniform1f(
            this.uniformLocations[`${prefix}Width`]!,
            region.lineWidth / h,
        );
        gl.uniform1f(
            this.uniformLocations[`${prefix}Start`]!,
            region.startAngle,
        );
        gl.uniform1f(
            this.uniformLocations[`${prefix}End`]!,
            region.endAngle,
        );
        gl.uniform1f(this.uniformLocations[`${prefix}Active`]!, 1.0);
    }
}
