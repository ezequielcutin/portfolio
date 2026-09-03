precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_feedback;

const vec3 colorA = vec3(0.063, 0.059, 0.051);
const vec3 colorB = vec3(0.878, 0.502, 0.333);

void main() {
    vec4 feedback = texture2D(u_feedback, v_uv);
    vec3 base = mix(colorA, colorB, v_uv.y);
    vec3 col = base + feedback.rgb;
    col = max(col - vec3(feedback.a), vec3(0.0));
    gl_FragColor = vec4(min(col, 1.0), 1.0);
}
