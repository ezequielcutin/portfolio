# Footer Screen Feedback Design

## Goal

Turn the footer WebGL panel into a true frame-feedback effect. Pointer movement paints soft color into a persistent GPU texture. Each new frame reads the previous frame, gently moves and fades it, adds the current pointer brush, and stores the result for the next frame.

This is image feedback, equivalent in structure to a TouchDesigner Feedback TOP. Elapsed time does not generate the pattern. A frame-delta uniform only normalizes decay across display refresh rates.

## Visual Behavior

- Keep the existing vertical ink-to-accent gradient as the stable background.
- Paint an electric-blue core with a theme-accent orange outer halo at the
  pointer's UV position.
- Preserve painted pixels between frames so movement leaves trails.
- Apply a subtle inward UV scale around the panel center (approximately 0.06
  UV-scale units per second) so old trail energy slowly flows instead of
  remaining as stationary stamps.
- Fade feedback with an initial target half-life of approximately 1.5 seconds,
  normalized to elapsed frame time.
- Let pointer coordinates continue beyond the canvas bounds so the brush approaches and leaves smoothly.
- Clear feedback on drawing-buffer resize and WebGL context restoration.
- Under `prefers-reduced-motion`, render a static gradient and pointer response without running the feedback animation loop.

## Rendering Architecture

`footer-screen.js` owns two same-size RGBA textures and two framebuffers:

1. Bind the write framebuffer.
2. Bind the read texture as `u_previous`.
3. Run the feedback fragment shader over the existing full-screen quad.
4. Bind the default framebuffer.
5. Run a display fragment shader that copies the newly written texture to the canvas.
6. Swap the read and write targets.

The renderer must never sample a texture attached to the currently bound write framebuffer. Texture parameters use linear filtering and clamp-to-edge wrapping, which are valid for the panel's potentially non-power-of-two dimensions in WebGL 1.

The existing vertex shader can serve both passes. A dedicated display fragment shader keeps the copy pass explicit and prevents the feedback equation from being applied twice.

## Shader Contract

The feedback shader receives:

- `sampler2D u_previous`: prior feedback frame.
- `vec2 u_mouse`: pointer in canvas UV coordinates.
- `float u_delta`: clamped seconds since the previous rendered frame.
- `vec2 u_resolution`: drawing-buffer dimensions for aspect-correct brush distance.

For each fragment, the shader:

1. Scales the previous-frame sample coordinate slightly inward around UV center.
2. Samples and time-normalizes the retained feedback color.
3. Computes an aspect-correct soft pointer brush.
4. Adds the brush contribution to the retained history with bounded color output.
5. Produces transparent-independent opaque RGB output.

The initial brush radius is approximately 8% of the panel height, with a
smaller blue core and a wider orange halo. These values are named constants in
the shader so visual tuning does not require renderer changes.

The stable vertical gradient is composed in the display result rather than accumulated into feedback. This prevents the background from saturating the feedback texture on every frame.

## Lifecycle and Performance

- Lazy initialization remains controlled by the existing `IntersectionObserver`.
- The animation loop runs only while the panel is near/in view.
- `requestAnimationFrame` follows the display refresh rate; no 60 Hz assumption is made.
- Frame delta is clamped to 1/15 second after tab suspension to avoid clearing
  the trail in one frame.
- Both framebuffer targets are allocated during boot and reallocated when the drawing buffer changes size.
- Framebuffers are checked for completeness. Failure quietly activates the existing unsupported fallback.
- Context loss stops rendering and discards JavaScript references; context restoration rebuilds programs, buffers, textures, and framebuffers.
- GPU resources replaced during resize are explicitly deleted.

## Reduced Motion

When reduced motion is requested, the renderer does not start the continuous animation loop. It draws the base gradient plus the current pointer brush on boot, resize, and pointer movement. This preserves the panel's appearance and interaction without persistent motion.

## Verification

- Build succeeds and regenerates `shaders.js`.
- The panel shows the stable theme gradient before interaction.
- Moving the pointer across the panel leaves smooth, slowly flowing trails.
- Trails fade at visually similar rates on 60 Hz and 120 Hz displays.
- Leaving and re-entering the viewport pauses and resumes without duplicate animation loops.
- Resizing clears and correctly reallocates feedback with no stretched history.
- Reduced-motion mode has no continuous render loop.
- Shader compilation, program linking, and framebuffer completeness produce no browser console errors.
