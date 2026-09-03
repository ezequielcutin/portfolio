precision mediump float;

varying vec2 v_uv;

uniform sampler2D u_previous;
uniform vec2 u_mouse;
uniform float u_delta;
uniform vec2 u_resolution;
uniform float u_pressed;

vec2 aspectSpace(vec2 uv) {
    vec2 point = uv;
    point.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return point;
}

void main() {
    float frameScale = u_delta * 60.0;
    float retention = pow(0.5, u_delta / 1.5);
    float inwardScale = pow(1.0 - (0.06 / 60.0), frameScale);
    float outwardScale = pow(1.0 + (0.06 / 60.0), frameScale);
    float flowScale = mix(inwardScale, outwardScale, u_pressed);
    vec2 previousUv = (v_uv - 0.5) / flowScale + 0.5;

    vec4 history = texture2D(u_previous, previousUv);
    history.rgb *= retention;
    history.a *= retention;

    float distanceToMouse = distance(aspectSpace(v_uv), aspectSpace(u_mouse));
    float core = smoothstep(0.08, 0.0, distanceToMouse);
    float halo = smoothstep(0.16, 0.03, distanceToMouse);
    float injection = 1.0 - exp(-18.0 * u_delta);

    if (u_pressed < 0.5) {
        // Default: bright additive brush, history flows inward.
        vec3 blue = vec3(0.08, 0.28, 1.0);
        vec3 accent = vec3(0.878, 0.502, 0.333);
        vec3 brush = mix(accent, blue, core);
        history.rgb = mix(history.rgb, max(history.rgb, brush), halo * injection);
    } else {
        // Pressed: carve darkness into alpha, history flows outward.
        history.a = min(history.a + halo * injection, 1.0);
    }

    gl_FragColor = history;
}
