precision mediump float;

varying vec2 v_uv;
uniform sampler2D u_feedback;

const vec3 colorA = vec3(0.063, 0.059, 0.051);
const vec3 colorB = vec3(0.878, 0.502, 0.333);

void main() {
    vec3 base = mix(colorA, colorB, v_uv.y);
    vec3 feedback = texture2D(u_feedback, v_uv).rgb;
    gl_FragColor = vec4(min(base + feedback, 1.0), 1.0);
}
