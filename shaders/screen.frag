precision mediump float;

varying vec2 v_uv;

uniform sampler2D u_previous;
uniform vec2 u_mouse;
uniform float u_delta;
uniform vec2 u_resolution;
uniform float u_pressed;
// One-shot ring stamp: 0 draws nothing, 1 is white, -1 is black. Set every
// frame, so a single keypress lands in exactly one frame of history and is
// then carried by the flow like any other mark.
uniform float u_stamp;
// Brush outline mode, toggled by E: 0 is the plain circle, 1 the noisy one.
uniform float u_jagged;
// Noise phase in radians, advanced by delta time in JS and wrapped to one
// turn there so it never grows large enough to lose precision here.
uniform float u_phase;

// The ring traces the display shader's solid core, not the old tight
// frame. Keep these equal to TOP_SOLID / SIDE_EDGE / BOTTOM_FADE in
// display.frag or the stamp drifts off the visible region.
const float TOP_SOLID = 0.82;
const float SIDE_EDGE = 8.0;
const float BOTTOM_FADE = 0.04;
// Half-thickness in device pixels rather than UV, so the line reads equally
// thin on all four sides of a panel that is far wider than it is tall.
const float RING_HALF_PX = 2.0;

// How far the noise pushes the brush outline, as a fraction of its radius.
const float JAG_AMOUNT = 0.7;

vec2 aspectSpace(vec2 uv) {
    vec2 point = uv;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return point;
}

// Band-limited noise around the brush outline, as a function of the angle.
//
// Not a hash lattice: fract(sin(...) * large) needs highp to avoid banding,
// and WebGL 1 does not guarantee highp in a fragment shader. Stacked octaves
// of the angle stay precision-safe, and because every harmonic is an integer
// the profile closes on itself at ±pi with no seam down one side.
//
// 1 - |sin| rather than sin so each octave creases where a plain sine would
// round off, which is what makes the outline read as torn instead of wavy.
// The constant offsets are arbitrary and only there to stop the octaves
// lining up into a symmetric flower.
//
// The phase advances each octave at a different integer rate, with the signs
// alternating so neighbouring octaves drift against each other and the shape
// churns rather than rotating as one piece. Integer rates matter: they make
// every octave advance by a whole number of turns over the phase's own turn,
// so the wrap JS applies is invisible. Changing one to a fraction puts a
// visible jump in the motion.
float outlineNoise(float angle, float phase) {
    float n = (1.0 - abs(sin(angle *  3.0 + 0.71 + phase       ))) * 0.50
            + (1.0 - abs(sin(angle *  7.0 + 2.13 - phase * 2.0 ))) * 0.27
            + (1.0 - abs(sin(angle * 13.0 + 4.27 + phase * 3.0 ))) * 0.15
            + (1.0 - abs(sin(angle * 23.0 + 1.37 - phase * 5.0 ))) * 0.08;
    // Amplitudes sum to 1 and |sin| averages 2/pi, so n sits near 1 - 2/pi.
    // Recentre on zero so the noise pulls the outline in as often as out.
    return n - 0.3634;
}

// Signed distance in pixels to the solid core the display pass keeps:
// negative inside, zero on the edge, positive outside.
float ringDistance(vec2 uv) {
    vec2 minUv = vec2(1.0 / SIDE_EDGE, BOTTOM_FADE);
    vec2 maxUv = vec2(1.0 - 1.0 / SIDE_EDGE, TOP_SOLID);
    vec2 halfExtent = 0.5 * (maxUv - minUv) * u_resolution;
    vec2 center = 0.5 * (minUv + maxUv) * u_resolution;
    vec2 d = abs(uv * u_resolution - center) - halfExtent;
    return min(max(d.x, d.y), 0.0) + length(max(d, vec2(0.0)));
}

void main() {
    float frameScale = u_delta * 60.0;
    float retention = pow(0.5, u_delta / 1.85);
    float inwardScale = pow(1.0 - (0.035 / 60.0), frameScale);
    float outwardScale = pow(1.0 + (0.05 / 60.0), frameScale);
    float flowScale = mix(inwardScale, outwardScale, u_pressed);
    vec2 previousUv = (v_uv - 0.5) / flowScale + 0.5;

    // Capillary bleed: a tiny irregular offset plus a 4-neighbour sample so
    // pigment creeps instead of holding a sharp trail.
    vec2 warp = vec2(
        sin(v_uv.y * 17.0 + v_uv.x * 6.0),
        sin(v_uv.x * 13.0 - v_uv.y * 9.0)
    ) * 0.0016;
    previousUv += warp;
    vec2 px = vec2(1.6) / max(u_resolution, vec2(1.0));
    vec4 history = texture2D(u_previous, previousUv) * 0.36;
    history += texture2D(u_previous, previousUv + vec2(px.x, 0.0)) * 0.16;
    history += texture2D(u_previous, previousUv - vec2(px.x, 0.0)) * 0.16;
    history += texture2D(u_previous, previousUv + vec2(0.0, px.y)) * 0.16;
    history += texture2D(u_previous, previousUv - vec2(0.0, px.y)) * 0.16;
    history.rgb *= retention;
    history.a *= retention;

    // Warping the distance rather than the thresholds keeps core and halo on
    // the same deformed outline, so the brush stays one shape instead of two.
    vec2 toMouse = aspectSpace(v_uv) - aspectSpace(u_mouse);
    float distanceToMouse = length(toMouse);
    float brushDistance = distanceToMouse;
    if (u_jagged > 0.5) {
        // atan is undefined at the exact centre. Falling back to a fixed
        // angle there also keeps the middle of the brush solid, where a warp
        // would otherwise open a pinhole.
        float angle = distanceToMouse > 0.0005
            ? atan(toMouse.y, toMouse.x)
            : 0.0;
        brushDistance *= 1.0 + JAG_AMOUNT * outlineNoise(angle, u_phase);
    }

    float core = smoothstep(0.10, 0.0, brushDistance);
    float halo = smoothstep(0.22, 0.04, brushDistance);
    float injection = 1.0 - exp(-11.0 * u_delta);

    if (u_pressed < 0.5) {
        // Default: stain the paper, history blooms rather than adding light.
        vec3 indigo = vec3(0.26, 0.35, 0.60);
        vec3 accent = vec3(0.878, 0.502, 0.333);
        vec3 brush = mix(accent, indigo, core * 0.65);
        history.rgb = mix(history.rgb, brush, halo * injection * 0.48);
    } else {
        // Pressed: carve darkness into alpha, history flows outward.
        history.a = min(history.a + halo * injection, 1.0);
    }

    // Stamped at full strength, not eased in like the brush: the ring gets
    // one frame to exist before the flow takes over. White writes colour,
    // black writes the alpha the display shader subtracts.
    if (abs(u_stamp) > 0.5) {
        float ring = 1.0 - smoothstep(
            RING_HALF_PX - 1.0, RING_HALF_PX + 1.0, abs(ringDistance(v_uv))
        );
        if (u_stamp > 0.0) history.rgb = max(history.rgb, vec3(ring));
        else history.a = max(history.a, ring);
    }

    gl_FragColor = history;
}
