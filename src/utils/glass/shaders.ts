/**
 * GLSL shader sources for the glass overlay effect.
 *
 * The vertex shader renders a fullscreen quad from 6 vertices (2 triangles).
 * The fragment shader composites a glass-like refraction / specular / iridescence
 * effect on top of an arbitrary source texture, masked to up to 2 arc-shaped regions.
 */

// ---------------------------------------------------------------------------
// Vertex shader  (WebGL 1 / GLSL ES 1.0)
// ---------------------------------------------------------------------------

export const VERTEX_SOURCE = /* glsl */ `
attribute vec2 aPosition;
varying vec2 vUV;

void main() {
    // Map clip-space [-1,1] to UV [0,1]
    vUV = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Fragment shader  (WebGL 1 / GLSL ES 1.0)
// ---------------------------------------------------------------------------

export const FRAGMENT_SOURCE = /* glsl */ `
precision mediump float;

varying vec2 vUV;

// Source texture (snapshot of the underlying canvas)
uniform sampler2D uSource;
uniform vec2      uResolution;   // canvas size in pixels
uniform float     uTime;         // seconds

// Glass material knobs
uniform float uChromaticAberration; // 0-1
uniform float uSpecularIntensity;   // 0-1
uniform float uFresnelPower;        // 1-5
uniform float uDisplacement;        // 0-1

// Arc 0
uniform vec2  uArc0Center;  // normalised [0,1]
uniform float uArc0Radius;  // normalised
uniform float uArc0Width;   // normalised
uniform float uArc0Start;   // radians
uniform float uArc0End;     // radians
uniform float uArc0Active;  // 0.0 or 1.0

// Arc 1
uniform vec2  uArc1Center;
uniform float uArc1Radius;
uniform float uArc1Width;
uniform float uArc1Start;
uniform float uArc1End;
uniform float uArc1Active;

// ---- helpers --------------------------------------------------------------

/** Signed distance to an arc ring (annulus segment). */
float arcSDF(vec2 p, vec2 center, float radius, float width) {
    return abs(length(p - center) - radius) - width * 0.5;
}

/**
 * Returns 1.0 when the angle of \`p\` relative to \`center\` falls inside
 * [startAngle, endAngle], 0.0 otherwise. The comparison accounts for
 * wrapping so arcs that cross the -PI/PI boundary work correctly.
 */
float angleMask(vec2 p, vec2 center, float startAngle, float endAngle) {
    float a = atan(p.y - center.y, p.x - center.x); // [-PI, PI]

    // Normalise angles into [0, 2*PI)
    float TWO_PI = 6.2831853;
    float s = mod(startAngle, TWO_PI);
    float e = mod(endAngle,   TWO_PI);
    float v = mod(a,          TWO_PI);

    // Handle the wrap-around case
    if (s < e) {
        return step(s, v) * step(v, e);
    } else {
        // Arc crosses the 0 boundary
        return 1.0 - step(e, v) * step(v, s);
    }
}

void main() {
    vec2 uv = vUV;

    // Aspect-corrected coordinates (so circles stay circular)
    float aspect = uResolution.x / uResolution.y;
    vec2 coord = vec2(uv.x * aspect, uv.y);

    // ---- SDF for both arcs ------------------------------------------------
    float d0 = 1e5;
    float d1 = 1e5;
    vec2  nearCenter = vec2(0.0);

    // Arc 0
    if (uArc0Active > 0.5) {
        vec2 c0 = vec2(uArc0Center.x * aspect, uArc0Center.y);
        d0 = arcSDF(coord, c0, uArc0Radius, uArc0Width);
        float am0 = angleMask(coord, c0, uArc0Start, uArc0End);
        d0 = mix(1e5, d0, am0);
        nearCenter = c0;
    }

    // Arc 1
    if (uArc1Active > 0.5) {
        vec2 c1 = vec2(uArc1Center.x * aspect, uArc1Center.y);
        d1 = arcSDF(coord, c1, uArc1Radius, uArc1Width);
        float am1 = angleMask(coord, c1, uArc1Start, uArc1End);
        d1 = mix(1e5, d1, am1);
        if (d1 < d0) nearCenter = c1;
    }

    float dist = min(d0, d1);

    // Smooth mask (feathered edge ~2 px)
    float feather = 2.0 / min(uResolution.x, uResolution.y);
    float mask = 1.0 - smoothstep(-feather, feather, dist);

    // Early exit — no glass here
    if (mask < 0.001) {
        gl_FragColor = texture2D(uSource, uv);
        return;
    }

    // ---- Glass effect -----------------------------------------------------

    // Radial normal pointing away from nearest arc centre
    vec2 delta = coord - nearCenter;
    vec2 normal = normalize(delta);

    // Displacement offset (subtle refraction warp)
    vec2 dispOffset = normal * uDisplacement * 0.01;

    // Chromatic aberration — shift R and B channels along the normal
    float abr = uChromaticAberration * 0.006;
    float r = texture2D(uSource, uv + dispOffset + normal * abr).r;
    float g = texture2D(uSource, uv + dispOffset).g;
    float b = texture2D(uSource, uv + dispOffset - normal * abr).b;
    vec3 refracted = vec3(r, g, b);

    // Edge distance for Fresnel (0 at ring centre, 1 at edge)
    float edgeDist = clamp(abs(dist) / (feather * 4.0 + 0.001), 0.0, 1.0);

    // Fresnel rim brightening
    float fresnel = pow(1.0 - edgeDist, uFresnelPower) * 0.25;

    // Phong specular highlight
    vec2  lightDir = normalize(vec2(-0.5, -0.7));
    float spec = pow(max(dot(normal, lightDir), 0.0), 32.0) * uSpecularIntensity;

    // Subtle iridescence shimmer
    float iridescence = sin(uTime * 0.5 + atan(normal.y, normal.x) * 3.0) * 0.015;

    vec3 glass = refracted + fresnel + spec + iridescence;

    // Mix with un-affected source using the smooth mask
    vec4 source = texture2D(uSource, uv);
    gl_FragColor = vec4(mix(source.rgb, glass, mask), source.a);
}
`;
