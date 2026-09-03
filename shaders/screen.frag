precision mediump float;

varying vec2 v_uv;

uniform sampler2D u_previous;
uniform vec2 u_mouse;
uniform float u_delta;
uniform vec2 u_resolution;

vec2 aspectSpace(vec2 uv) {
    vec2 point = uv;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return point;
}

void main() {
    float frameScale = u_delta * 60.0;
    float retention = pow(0.5, u_delta / 1.5);
    float inwardScale = pow(1.0 - (0.06 / 60.0), frameScale);
    vec2 previousUv = (v_uv - 0.5) / inwardScale + 0.5;
    vec3 history = texture2D(u_previous, previousUv).rgb * retention;

    float distanceToMouse = distance(aspectSpace(v_uv), aspectSpace(u_mouse));
    float core = smoothstep(0.08, 0.0, distanceToMouse);
    float halo = smoothstep(0.16, 0.03, distanceToMouse);
    vec3 blue = vec3(0.08, 0.28, 1.0);
    vec3 accent = vec3(0.878, 0.502, 0.333);
    vec3 brush = mix(accent, blue, core);

    // Move toward the brush color instead of adding it every frame. Additive
    // injection eventually clips a stationary pointer to white; this bounded
    // blend converges while retaining the same frame-rate-independent feel.
    float injection = 1.0 - exp(-18.0 * u_delta);
    vec3 painted = mix(history, max(history, brush), halo * injection);

    gl_FragColor = vec4(painted, 1.0);
}
