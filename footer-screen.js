// Footer screen — a small WebGL panel at the very bottom of the page.
//
// Deliberately NOT the same renderer as header-ambience.js. That one is
// Canvas 2D because it draws ~80 discrete particles and connecting lines,
// which is geometry work. This one is per-pixel work — a fragment shader
// running over every pixel of a small rect — which is what a GPU is for.
// No library: one quad, two shader programs, ping-pong framebuffers.
//
// Lazy by construction. The GL context is not created until the canvas
// actually scrolls into view, because nobody lands on the site and
// immediately scrolls past the music section. Until then this file costs
// one IntersectionObserver.

function initFooterScreen() {
    const canvas = document.getElementById('footer-screen');
    if (!canvas) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ANIMATE = !reducedMotion;

    const SHADERS = window.PF_SHADERS || {};
    const FEEDBACK_VERT = SHADERS['screen.vert'];
    const FEEDBACK_FRAG = SHADERS['screen.frag'];
    const DISPLAY_VERT = SHADERS['display.vert'];
    const DISPLAY_FRAG = SHADERS['display.frag'];

    let gl = null;
    let feedbackProgram = null;
    let displayProgram = null;
    let quadBuffer = null;
    let rafId = null;
    let booted = false;
    let inView = false;

    let uPrevious = null;
    let uMouse = null;
    let uDelta = null;
    let uResolution = null;
    let uPressed = null;
    let uStamp = null;
    let uJagged = null;
    let uFeedback = null;
    let uPageBg = null;

    // Ring stamps are queued rather than applied on the spot: a keypress can
    // land between frames, and the shader only draws one per pass. One is
    // consumed per render, so pressing Q then W a frame apart keeps both.
    // Capped because nothing drains the queue while the panel is off-screen.
    const STAMP_WHITE = 1;
    const STAMP_BLACK = -1;
    const STAMP_QUEUE_MAX = 8;
    const stampQueue = [];

    // Brush outline, toggled by E. A mode rather than a stamp, so it needs no
    // queue: it just holds until pressed again.
    let jagged = false;

    let targets = null;
    let readIndex = 0;
    let lastTimestamp = null;

    let mouseU = -1, mouseV = -1;
    let pointerDown = false;
    let bufferW = 0;
    let bufferH = 0;

    let rect = null;
    let pageBg = [0.063, 0.059, 0.051];

    function refreshRect() { rect = canvas.getBoundingClientRect(); }

    function parseCssHexColor(str) {
        const hex = str.trim().replace(/^#/, '');
        if (!hex) return null;
        const full = hex.length === 3
            ? hex.split('').map((c) => c + c).join('')
            : hex;
        if (full.length !== 6) return null;
        const n = parseInt(full, 16);
        if (Number.isNaN(n)) return null;
        return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
    }

    function refreshPageBg() {
        const parsed = parseCssHexColor(
            getComputedStyle(document.documentElement).getPropertyValue('--bg')
        );
        if (parsed) pageBg = parsed;
    }

    function compile(type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('[footer-screen] shader compile failed:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    function link(vertSrc, fragSrc) {
        const vert = compile(gl.VERTEX_SHADER, vertSrc);
        const frag = compile(gl.FRAGMENT_SHADER, fragSrc);
        if (!vert || !frag) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vert);
        gl.attachShader(prog, frag);
        gl.linkProgram(prog);
        gl.deleteShader(vert);
        gl.deleteShader(frag);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error('[footer-screen] program link failed:', gl.getProgramInfoLog(prog));
            gl.deleteProgram(prog);
            return null;
        }
        return prog;
    }

    function bindQuad(program) {
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const aPos = gl.getAttribLocation(program, 'a_pos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    }

    function destroyTargets() {
        if (!gl || !targets) return;
        for (const target of targets) {
            if (!target) continue;
            if (target.framebuffer) gl.deleteFramebuffer(target.framebuffer);
            if (target.texture) gl.deleteTexture(target.texture);
        }
        targets = null;
    }

    function createTarget(width, height) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, null
        );

        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0
        );

        const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindTexture(gl.TEXTURE_2D, null);

        if (status !== gl.FRAMEBUFFER_COMPLETE) {
            console.error('[footer-screen] framebuffer incomplete:', status);
            gl.deleteFramebuffer(framebuffer);
            gl.deleteTexture(texture);
            return null;
        }

        return { texture, framebuffer };
    }

    function clearTarget(target) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.viewport(0, 0, bufferW, bufferH);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    function clearTargets() {
        if (!targets) return;
        for (const target of targets) clearTarget(target);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    function allocateTargets(width, height) {
        destroyTargets();
        const a = createTarget(width, height);
        const b = createTarget(width, height);
        if (!a || !b) {
            if (a) {
                gl.deleteFramebuffer(a.framebuffer);
                gl.deleteTexture(a.texture);
            }
            if (b) {
                gl.deleteFramebuffer(b.framebuffer);
                gl.deleteTexture(b.texture);
            }
            return false;
        }
        targets = [a, b];
        readIndex = 0;
        clearTargets();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return true;
    }

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (canvas.width === w && canvas.height === h) return false;
        canvas.width = w;
        canvas.height = h;
        bufferW = w;
        bufferH = h;
        gl.viewport(0, 0, w, h);
        if (!allocateTargets(w, h)) {
            booted = false;
            teardownGl();
            canvas.classList.add('is-unsupported');
            return false;
        }
        lastTimestamp = null;
        return true;
    }

    function render(timestamp) {
        if (!booted || !gl || !targets) return;

        const writeIndex = 1 - readIndex;
        const readTarget = targets[readIndex];
        const writeTarget = targets[writeIndex];

        let delta;
        if (timestamp == null) {
            delta = 1 / 60;
        } else if (lastTimestamp == null) {
            delta = 1 / 60;
            lastTimestamp = timestamp;
        } else {
            delta = Math.min((timestamp - lastTimestamp) / 1000, 1 / 15);
            lastTimestamp = timestamp;
        }

        // Pass 1 — accumulate feedback into the write target.
        gl.bindFramebuffer(gl.FRAMEBUFFER, writeTarget.framebuffer);
        gl.viewport(0, 0, bufferW, bufferH);
        gl.useProgram(feedbackProgram);
        bindQuad(feedbackProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, readTarget.texture);
        gl.uniform1i(uPrevious, 0);
        gl.uniform2f(uMouse, mouseU, mouseV);
        gl.uniform1f(uDelta, delta);
        gl.uniform2f(uResolution, bufferW, bufferH);
        gl.uniform1f(uPressed, pointerDown ? 1.0 : 0.0);
        // Unconditional: leaving a stale non-zero here would re-stamp the
        // ring on every frame instead of once per keypress.
        gl.uniform1f(uStamp, stampQueue.length ? stampQueue.shift() : 0);
        gl.uniform1f(uJagged, jagged ? 1.0 : 0.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Pass 2 — composite gradient + feedback to the visible canvas.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, bufferW, bufferH);
        gl.useProgram(displayProgram);
        bindQuad(displayProgram);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, writeTarget.texture);
        gl.uniform1i(uFeedback, 0);
        gl.uniform3f(uPageBg, pageBg[0], pageBg[1], pageBg[2]);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        readIndex = writeIndex;
    }

    function staticRender() {
        if (!booted || !gl || !targets) return;
        clearTargets();
        lastTimestamp = null;
        render(null);
        // Static path clears history each draw; keep readIndex stable.
        readIndex = 0;
    }

    function loop(timestamp) {
        render(timestamp);
        rafId = requestAnimationFrame(loop);
    }

    function start() {
        if (!booted || !ANIMATE || rafId !== null) return;
        lastTimestamp = null;
        rafId = requestAnimationFrame(loop);
    }

    function stop() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function teardownGl() {
        stop();
        destroyTargets();
        if (gl && quadBuffer) gl.deleteBuffer(quadBuffer);
        if (gl && feedbackProgram) gl.deleteProgram(feedbackProgram);
        if (gl && displayProgram) gl.deleteProgram(displayProgram);
        gl = null;
        feedbackProgram = null;
        displayProgram = null;
        quadBuffer = null;
        uPrevious = null;
        uMouse = null;
        uDelta = null;
        uResolution = null;
        uPressed = null;
        uStamp = null;
        uJagged = null;
        uFeedback = null;
        uPageBg = null;
        lastTimestamp = null;
        bufferW = 0;
        bufferH = 0;
    }

    function boot() {
        if (booted) return;

        if (!FEEDBACK_VERT || !FEEDBACK_FRAG || !DISPLAY_VERT || !DISPLAY_FRAG) {
            console.error(
                '[footer-screen] shaders.js missing screen/display shaders — run npm run build'
            );
            canvas.classList.add('is-unsupported');
            return;
        }

        gl = canvas.getContext('webgl', {
            alpha: false,
            antialias: false,
            depth: false,
            stencil: false,
            powerPreference: 'low-power',
        });
        if (!gl) {
            canvas.classList.add('is-unsupported');
            return;
        }

        feedbackProgram = link(FEEDBACK_VERT, FEEDBACK_FRAG);
        displayProgram = link(DISPLAY_VERT, DISPLAY_FRAG);
        if (!feedbackProgram || !displayProgram) {
            teardownGl();
            canvas.classList.add('is-unsupported');
            return;
        }

        quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW
        );

        uPrevious = gl.getUniformLocation(feedbackProgram, 'u_previous');
        uMouse = gl.getUniformLocation(feedbackProgram, 'u_mouse');
        uDelta = gl.getUniformLocation(feedbackProgram, 'u_delta');
        uResolution = gl.getUniformLocation(feedbackProgram, 'u_resolution');
        uPressed = gl.getUniformLocation(feedbackProgram, 'u_pressed');
        uStamp = gl.getUniformLocation(feedbackProgram, 'u_stamp');
        uJagged = gl.getUniformLocation(feedbackProgram, 'u_jagged');
        uFeedback = gl.getUniformLocation(displayProgram, 'u_feedback');
        uPageBg = gl.getUniformLocation(displayProgram, 'u_page_bg');

        booted = true;
        refreshPageBg();
        refreshRect();
        if (!resize()) {
            bufferW = canvas.width;
            bufferH = canvas.height;
            if (!allocateTargets(bufferW, bufferH)) {
                booted = false;
                teardownGl();
                canvas.classList.add('is-unsupported');
                return;
            }
        }

        if (ANIMATE) {
            render(performance.now());
            start();
        } else {
            staticRender();
        }

        canvas.classList.add('is-live');
    }

    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        booted = false;
        teardownGl();
    });
    canvas.addEventListener('webglcontextrestored', () => {
        boot();
    });

    function setPointerFromEvent(e) {
        if (!booted || !rect) return;
        mouseU = (e.clientX - rect.left) / rect.width;
        mouseV = 1 - (e.clientY - rect.top) / rect.height;
    }

    function onPointerMove(e) {
        setPointerFromEvent(e);
        if (!ANIMATE && inView) staticRender();
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        pointerDown = true;
        setPointerFromEvent(e);
        if (!ANIMATE && inView) staticRender();
    }

    function onPointerUp() {
        pointerDown = false;
    }

    function isTypingTarget(target) {
        if (!target) return false;
        if (target.isContentEditable) return true;
        const tag = target.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    }

    function onKeyDown(e) {
        // e.repeat filters held-key auto-repeat, so one press is one ring.
        // Modifiers are skipped so browser and OS shortcuts (⌘Q, ⌘W) do not
        // also stamp on their way out.
        if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
        if (isTypingTarget(e.target)) return;
        const key = e.key ? e.key.toLowerCase() : '';
        if (key !== 'q' && key !== 'w' && key !== 'e') return;
        // Nothing renders while the panel is off-screen, so an accepted stamp
        // would sit in the queue and fire on whatever frame comes next.
        if (!booted || !inView) return;

        if (key === 'e') {
            jagged = !jagged;
        } else if (stampQueue.length < STAMP_QUEUE_MAX) {
            stampQueue.push(key === 'q' ? STAMP_WHITE : STAMP_BLACK);
        }
        if (!ANIMATE) staticRender();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', onPointerUp, { passive: true });

    window.addEventListener('scroll', () => { if (booted) refreshRect(); }, { passive: true });
    window.addEventListener('resize', () => { if (booted) refreshRect(); });

    if ('MutationObserver' in window) {
        const themeObserver = new MutationObserver(() => {
            refreshPageBg();
            if (booted && inView) {
                if (ANIMATE) render(performance.now());
                else staticRender();
            }
        });
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme'],
        });
    }

    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                inView = entry.isIntersecting;
                if (inView) {
                    boot();
                    refreshRect();
                    start();
                } else {
                    stop();
                }
            }
        }, { rootMargin: '200px' });
        io.observe(canvas);
    } else {
        inView = true;
        boot();
    }

    if ('ResizeObserver' in window) {
        const ro = new ResizeObserver(() => {
            if (!booted) return;
            refreshRect();
            if (resize()) {
                if (ANIMATE) render(performance.now());
                else staticRender();
            }
        });
        ro.observe(canvas);
    }
}
