precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_feedback;
uniform vec3 u_page_bg;

const vec3 colorA = vec3(0.063, 0.059, 0.051);
const vec3 colorB = vec3(0.878, 0.502, 0.333);

// Edge frame: distance from the nearest border, scaled and sharpened with
// power so only a thin band fades into the page background. The horizontal
// and vertical falloffs are sharpened independently — the panel is far wider
// than it is tall, so the same exponent does not read the same on both axes.
// EDGE sets band width and is inverse: the fade reaches full opacity at
// 1/EDGE in UV, so bigger means a tighter band. X is the left/right pair,
// Y the top/bottom pair. UV is normalized per axis, so equal values give
// unequal pixel widths on a panel this wide.
const float FRAME_EDGE_X = 114.0;
const float FRAME_EDGE_Y = 14.0;
const float FRAME_POWER_X = 2.2;
const float FRAME_POWER_Y = 2.2;

void main() {
    vec4 feedback = texture2D(u_feedback, v_uv);
    vec3 base = mix(colorA, colorB, v_uv.y);
    vec3 col = base + feedback.rgb;
    col = max(col - vec3(feedback.a), vec3(0.0));
    col = min(col, 1.0);

    vec2 edgeDist = min(v_uv, 1.0 - v_uv);
    float frameX = pow(clamp(edgeDist.x * FRAME_EDGE_X, 0.0, 1.0), FRAME_POWER_X);
    float frameY = pow(clamp(edgeDist.y * FRAME_EDGE_Y, 0.0, 1.0), FRAME_POWER_Y);
    float frame = min(frameX, frameY);
    col = mix(u_page_bg, col, frame);

    gl_FragColor = vec4(col, 1.0);
}
