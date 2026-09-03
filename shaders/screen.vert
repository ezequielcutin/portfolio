attribute vec2 a_pos;
varying vec2 v_uv;

void main() {
    // a_pos is a clip-space quad (-1..1); uv is the same space remapped to
    // 0..1 with the origin at the bottom-left.
    v_uv = a_pos * 0.5 + 0.5;
    gl_Position = vec4(a_pos, 0.0, 1.0);
}
