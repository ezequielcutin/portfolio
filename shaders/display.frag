precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_feedback;
uniform vec3 u_page_bg;
uniform vec3 u_accent;
uniform vec2 u_resolution;

// Full-bleed wash. Overflow on .pf-tail clips at the window and at the
// projects separator — no UV inset, or it lands on the music-column edge.
const float ACCENT_POOL = 0.18;

// Cooler stain mixed into the terracotta, like a second pigment in the water.
const vec3 INDIGO = vec3(0.28, 0.36, 0.62);
// Dried film: old fragments thin toward this so the page (and a dark red)
// seeps through instead of the wash fading to empty grey.
const vec3 DRIED = vec3(0.22, 0.04, 0.05);

void main() {
    vec4 feedback = texture2D(u_feedback, v_uv);

    // Page color at the top, a thin terracotta wash pooling toward the
    // bottom. A slow cloud, not a lattice — just enough to keep the
    // empty paper from reading as a flat fill.
    float pool = pow(clamp(1.0 - v_uv.y, 0.0, 1.0), 1.65) * ACCENT_POOL;
    pool *= 0.93 + 0.14 * sin(v_uv.x * 2.1 + v_uv.y * 1.4);
    vec3 base = mix(u_page_bg, u_accent, pool);

    // Stain, not light. Feedback tints the paper instead of adding until
    // the cores blow out to white. Amount is also age: faint history is
    // older pigment, so it reads as a thinner, dried film.
    float amount = length(feedback.rgb);
    float wash = clamp(pow(amount * 0.96, 0.72), 0.0, 1.0);
    float wet = smoothstep(0.10, 0.52, amount);
    float cool = clamp(feedback.b / max(amount, 0.001), 0.0, 1.0);
    vec3 wetPigment = mix(u_accent, INDIGO, cool * 0.55);
    vec3 pigment = mix(mix(u_page_bg, DRIED, 0.82), wetPigment, wet);

    // Tide line: pigment gathers at the wet edge of each bloom. Sample the
    // stain field, not UV, so definition follows the marks instead of
    // laying a grain mesh over the whole section.
    vec2 px = vec2(2.4) / max(u_resolution, vec2(1.0));
    float neighbors = 0.25 * (
        length(texture2D(u_feedback, v_uv + vec2(px.x, 0.0)).rgb) +
        length(texture2D(u_feedback, v_uv - vec2(px.x, 0.0)).rgb) +
        length(texture2D(u_feedback, v_uv + vec2(0.0, px.y)).rgb) +
        length(texture2D(u_feedback, v_uv - vec2(0.0, px.y)).rgb)
    );
    float rim = smoothstep(0.03, 0.16, abs(amount - neighbors));
    pigment *= 1.0 - rim * 0.32;
    // Fresh cores stay dense; aged wash is a veil — coverage drops so the
    // page and dried red show through the body of the bloom.
    float coverage = mix(wash * 0.34, wash * 0.88, wet);
    vec3 col = mix(base, pigment, mix(coverage, min(coverage * 1.2, 1.0), rim));
    col = max(col - vec3(feedback.a * 0.85), vec3(0.0));
    col = min(col, 1.0);

    gl_FragColor = vec4(col, 1.0);
}
