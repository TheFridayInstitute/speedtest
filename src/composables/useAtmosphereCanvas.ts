import {
    onBeforeUnmount,
    onMounted,
    reactive,
    watch,
    type Ref,
    type ShallowRef,
} from "vue";
import { clampNum as clamp } from "@utils/oklch";
import { srgbToOKLab, rawOklabToOklch, rawOklchToOklab, oklabToRgb255 } from "@utils/oklch";
import { cssToRgb, DEFAULT_ATMOSPHERE_CONFIG } from "./atmosphereConfig";
import type { AtmosphereConfig } from "./atmosphereConfig";

export type { AtmosphereConfig } from "./atmosphereConfig";
export { DEFAULT_ATMOSPHERE_CONFIG } from "./atmosphereConfig";

// ── Local helpers ──

function rgba(r: number, g: number, b: number, a: number): string {
    return `rgba(${r},${g},${b},${a})`;
}

function rgbToOklch(r: number, g: number, b: number): [number, number, number] {
    const [L, a, b_] = srgbToOKLab(r / 255, g / 255, b / 255);
    return rawOklabToOklch(L, a, b_);
}

function oklchToRgb(L: number, C: number, H: number): [number, number, number] {
    const [la, a, b] = rawOklchToOklab(L, C, H);
    return oklabToRgb255(la, a, b);
}

// ── Composable ──

export function useAtmosphereCanvas(
    canvasRef: Ref<HTMLCanvasElement | null> | ShallowRef<HTMLCanvasElement | null>,
    cssColor: Ref<string>,
    config?: AtmosphereConfig,
) {
    const cfg = config ?? reactive({ ...DEFAULT_ATMOSPHERE_CONFIG });

    let frame = 0;
    let observer: ResizeObserver | null = null;
    let surfaceRgb: [number, number, number] = [255, 255, 255];
    let baseOklch: [number, number, number] = [0.5, 0.1, 0];
    let running = false;

    const reducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motionScale = reducedMotion ? 0.22 : 1;

    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isSafari = /Safari/i.test(ua) && !/Chrom(e|ium)|Android/i.test(ua);
    const isLowPower = (navigator?.hardwareConcurrency ?? 8) <= 4;
    const dprMax = isSafari || isLowPower ? 1.6 : 2;
    const blurScale = isSafari || isLowPower ? 0.82 : 1;

    function updatePalette(css: string) {
        const rgb = cssToRgb(css);
        surfaceRgb = rgb;
        baseOklch = rgbToOklch(rgb[0], rgb[1], rgb[2]);
    }

    /** Build blob colors on-the-fly from current config + base OKLCH. */
    function buildBlobColors(): Array<[number, number, number]> {
        const [L, C, H] = baseOklch;
        const count = cfg.blobCount;
        const colors: Array<[number, number, number]> = [];

        for (let i = 0; i < count; i++) {
            const isSmall = i >= Math.ceil(count / 2);
            const lShift = isSmall ? cfg.lShiftSmall : cfg.lShiftLarge;
            const hShift = isSmall ? cfg.hueShiftSmall : cfg.hueShiftLarge;

            // Alternate +/- for L, spread hue evenly
            const sign = i % 2 === 0 ? 1 : -1;
            const lAmount = lShift * (0.5 + (i / count) * 0.5) * sign;
            const hAmount = hShift * ((i + 1) / count) * (i % 3 === 0 ? -1 : 1);

            colors.push(
                oklchToRgb(
                    clamp(L + lAmount, 0, 1),
                    C,
                    (H + hAmount + 360) % 360,
                ),
            );
        }
        return colors;
    }

    function stop() {
        running = false;
        cancelAnimationFrame(frame);
        observer?.disconnect();
        observer = null;
    }

    function start() {
        stop();

        const canvas = canvasRef.value;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        running = true;

        const resize = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w === 0 || h === 0) return;
            const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
            canvas.width = Math.floor(w * dpr);
            canvas.height = Math.floor(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };

        resize();
        observer = new ResizeObserver(resize);
        observer.observe(canvas);

        updatePalette(cssColor.value);

        const render = (now: number) => {
            if (!running) return;

            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            if (w === 0 || h === 0) {
                frame = requestAnimationFrame(render);
                return;
            }

            const t = now * 0.001 * motionScale * cfg.speed;
            const dim = Math.max(w, h);
            const blobColors = buildBlobColors();
            const count = blobColors.length;
            const blur = cfg.blur * blurScale;

            // Surface fill
            ctx.globalAlpha = cfg.bgAlpha;
            ctx.globalCompositeOperation = "source-over";
            ctx.filter = "none";
            ctx.fillStyle = rgba(surfaceRgb[0], surfaceRgb[1], surfaceRgb[2], 1);
            ctx.fillRect(0, 0, w, h);

            // Blobs
            ctx.globalAlpha = 1;
            ctx.save();
            ctx.filter = `blur(${blur}px) saturate(140%)`;

            for (let i = 0; i < count; i++) {
                const c = blobColors[i]!;
                const isSmall = i >= Math.ceil(count / 2);
                const r = dim * (isSmall
                    ? cfg.blobBaseRadius * cfg.smallRadiusScale + i * cfg.blobRadiusStep * 0.5
                    : cfg.blobBaseRadius + i * cfg.blobRadiusStep);
                const phase = i * ((Math.PI * 2) / count);
                const ox = w * cfg.orbitX;
                const oy = h * cfg.orbitY;
                const x =
                    w * 0.5 +
                    Math.sin(t * (0.4 + i * 0.15) + phase) * ox +
                    Math.cos(t * 0.2 + i) * ox * 0.5;
                const y =
                    h * 0.5 +
                    Math.cos(t * (0.35 + i * 0.12) + phase) * oy +
                    Math.sin(t * 0.18 + i) * oy * 0.6;

                const peakAlpha = isSmall ? cfg.peakAlphaSmall : cfg.peakAlphaLarge;
                const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
                grad.addColorStop(0, rgba(c[0], c[1], c[2], peakAlpha));
                grad.addColorStop(cfg.gradStop2, rgba(c[0], c[1], c[2], peakAlpha * 0.6));
                grad.addColorStop(cfg.gradStop3, rgba(c[0], c[1], c[2], peakAlpha * 0.2));
                grad.addColorStop(cfg.gradStop4, rgba(c[0], c[1], c[2], 0));

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
            frame = requestAnimationFrame(render);
        };

        frame = requestAnimationFrame(render);
    }

    watch(cssColor, (css) => updatePalette(css));

    if (typeof window !== "undefined") {
        const mo = new MutationObserver(() => updatePalette(cssColor.value));
        mo.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });
        onBeforeUnmount(() => mo.disconnect());
    }

    onMounted(() => start());

    watch(canvasRef, (el) => {
        if (el && !running) start();
    });

    onBeforeUnmount(() => stop());

    return cfg;
}
