precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_feedback;
uniform vec3 u_page_bg;
uniform vec3 u_accent;
uniform vec2 u_resolution;

// Dissolve into the page instead of drawing a framed rectangle.
// v_uv.y is 0 at the bottom, 1 at the top — so the long falloff is
// from the top, where this panel meets the HTML footer.
//
// These bounds are shared with the Q/W ring in screen.frag. If you
// retune the dissolve, retune the ring to match.
const float TOP_SOLID = 0.70;
const float SIDE_EDGE = 8.0;
const float SIDE_POWER = 1.25;
const float BOTTOM_FADE = 0.04;
const float ACCENT_POOL = 0.18;

// Cooler stain mixed into the terracotta, like a second pigment in the water.
const vec3 INDIGO = vec3(0.28, 0.36, 0.62);

// Band-limited grain. Same stacked-sine approach as the brush outline:
// no fract(sin) hash, which bands on mediump.
float grain(vec2 uv) {
    vec2 p = uv * vec2(3.1, 4.7) + uv * u_resolution * 0.0035;
    return sin(p.x * 19.0 + p.y * 11.0) * 0.46
         + sin(p.x * 47.0 - p.y * 31.0) * 0.32
         + sin(p.x * 8.0  + p.y * 67.0) * 0.22;
}

void main() {
    vec4 feedback = texture2D(u_feedback, v_uv);
    float g = grain(v_uv);

    // Page color at the top, a thin terracotta wash pooling toward the
    // bottom. Granulation breaks the wash so it reads as pigment, not a
    // digital gradient fill.
    float pool = pow(clamp(1.0 - v_uv.y, 0.0, 1.0), 1.65) * ACCENT_POOL;
    pool *= 0.88 + 0.22 * g;
    vec3 base = mix(u_page_bg, u_accent, pool);

    // Stain, not light. Feedback tints the paper instead of adding until
    // the cores blow out to white.
    float wash = clamp(length(feedback.rgb) * 0.92, 0.0, 1.0);
    float cool = clamp(feedback.b / max(wash, 0.001), 0.0, 1.0);
    vec3 pigment = mix(u_accent, INDIGO, cool * 0.55);
    pigment = mix(pigment, pigment * (0.90 + 0.18 * g), wash);
    vec3 col = mix(base, pigment, wash * 0.78);
    col = max(col - vec3(feedback.a * 0.85), vec3(0.0));
    col = min(col, 1.0);

    // Scalloped wet edge so the dissolve is not a straight horizontal.
    float wobble = 0.045 * sin(v_uv.x * 8.5) + 0.028 * sin(v_uv.x * 21.0 + 1.4);
    float top = smoothstep(1.0, TOP_SOLID + wobble, v_uv.y);
    float side = pow(
        clamp(min(v_uv.x, 1.0 - v_uv.x) * SIDE_EDGE, 0.0, 1.0),
        SIDE_POWER
    );
    float bottom = smoothstep(0.0, BOTTOM_FADE, v_uv.y);
    col = mix(u_page_bg, col, top * side * bottom);

    gl_FragColor = vec4(col, 1.0);
}
