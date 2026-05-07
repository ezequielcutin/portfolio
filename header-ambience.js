function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function initHeaderAmbience() {
    const canvas = document.getElementById('header-ambience');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Accent color from CSS
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';

    // Parse accent into r,g,b
    function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return { r, g, b };
    }
    const col = hexToRgb(accent);

    // Feature flags
    const dragDropPhysics = true;

    // Particle config
    const PARTICLE_COUNT = 80;
    const CONNECTION_DIST = 120;
    const MOUSE_RADIUS = 180;
    const BASE_SPEED = 0.18;

    // Physics constants (drag-drop mode)
    const SPRING_STIFFNESS = 0.003;
    const SPRING_DAMPING = 0.92;
    const ANCHOR_SIZE = 5;
    const ANCHOR_GLOW = 18;
    const GRAB_RADIUS = 24;
    const MAX_SPRING_HOPS = 3;
    const SPRING_FALLOFF = 0.35; // force multiplier per hop

    let W, H;
    let mouseX = -9999, mouseY = -9999;
    let particles = [];
    let animId;

    // Drag state
    let draggedParticle = null;
    let isDragging = false;

    function resize() {
        const host = canvas.parentElement || document.body;
        W = host.clientWidth || window.innerWidth;
        H = host.clientHeight || 260;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * BASE_SPEED * 2;
            this.vy = (Math.random() - 0.5) * BASE_SPEED * 2;
            this.size = Math.random() * 1.8 + 0.6;
            this.baseAlpha = Math.random() * 0.4 + 0.15;
            this.alpha = this.baseAlpha;
            // Some particles are ASCII characters
            this.isChar = Math.random() < 0.2;
            this.char = ['0', '1', '/', '\\', '{', '}', '<', '>', '.', ':', ';', '~', '#'][Math.floor(Math.random() * 13)];
            this.charSize = Math.random() * 5 + 8;
            // Pulse phase for gentle breathing
            this.pulsePhase = Math.random() * Math.PI * 2;
            this.pulseSpeed = Math.random() * 0.008 + 0.004;
            // Drag-drop state
            this.pinned = false;
            this.anchorX = this.x;
            this.anchorY = this.y;
        }
        update() {
            // If this particle is being dragged, snap to mouse
            if (dragDropPhysics && this.pinned) {
                this.x = mouseX;
                this.y = mouseY;
                this.vx = 0;
                this.vy = 0;
                this.anchorX = this.x;
                this.anchorY = this.y;
                return;
            }

            this.x += this.vx;
            this.y += this.vy;

            // Wrap around (skip if being pulled by spring — let it stretch)
            if (!dragDropPhysics || !isDragging) {
                if (this.x < -10) this.x = W + 10;
                if (this.x > W + 10) this.x = -10;
                if (this.y < -10) this.y = H + 10;
                if (this.y > H + 10) this.y = -10;
            } else {
                // Soft clamp during drag so particles don't vanish
                this.x = Math.max(-50, Math.min(W + 50, this.x));
                this.y = Math.max(-50, Math.min(H + 50, this.y));
            }

            // Mouse proximity glow
            const dx = this.x - mouseX;
            const dy = this.y - mouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dragDropPhysics && isDragging) {
                // In drag mode: no repulsion, just glow near mouse
                if (dist < MOUSE_RADIUS) {
                    const influence = 1 - dist / MOUSE_RADIUS;
                    this.alpha = this.baseAlpha + influence * 0.4;
                } else {
                    this.alpha += (this.baseAlpha - this.alpha) * 0.05;
                }
            } else if (dist < MOUSE_RADIUS) {
                const influence = 1 - dist / MOUSE_RADIUS;
                this.alpha = this.baseAlpha + influence * 0.5;
                // Gentle repulsion
                const angle = Math.atan2(dy, dx);
                this.vx += Math.cos(angle) * influence * 0.02;
                this.vy += Math.sin(angle) * influence * 0.02;
            } else {
                this.alpha += (this.baseAlpha - this.alpha) * 0.05;
            }

            // Pulse breathing
            this.pulsePhase += this.pulseSpeed;
            const pulse = Math.sin(this.pulsePhase) * 0.12;
            this.alpha = Math.max(0, this.alpha + pulse * 0.1);

            // Dampen velocity — spring damping only for particles that have been disturbed
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (dragDropPhysics && isDragging && speed > BASE_SPEED * 2) {
                this.vx *= SPRING_DAMPING;
                this.vy *= SPRING_DAMPING;
            } else {
                this.vx *= 0.999;
                this.vy *= 0.999;
            }

            // Keep minimum drift (only when not being dragged around)
            if (!isDragging) {
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                if (speed < BASE_SPEED * 0.3) {
                    this.vx += (Math.random() - 0.5) * 0.05;
                    this.vy += (Math.random() - 0.5) * 0.05;
                }
            }
        }
        draw() {
            if (this.isChar) {
                ctx.font = this.charSize + 'px monospace';
                ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${this.alpha * 0.6})`;
                ctx.fillText(this.char, this.x, this.y);
            } else {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},${this.alpha})`;
                ctx.fill();
            }

            // Draw anchor highlight when draggable and hovered
            if (dragDropPhysics && this === draggedParticle && isDragging) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, ANCHOR_SIZE, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${col.r},${col.g},${col.b},0.9)`;
                ctx.shadowColor = `rgba(${col.r},${col.g},${col.b},0.8)`;
                ctx.shadowBlur = ANCHOR_GLOW;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            particles.push(new Particle());
        }
    }

    // Build adjacency list for connected particles
    function getNeighborMap() {
        const neighbors = new Map();
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    if (!neighbors.has(i)) neighbors.set(i, []);
                    if (!neighbors.has(j)) neighbors.set(j, []);
                    neighbors.get(i).push(j);
                    neighbors.get(j).push(i);
                }
            }
        }
        return neighbors;
    }

    // BFS from dragged particle — returns Map<particleIndex, hopCount>
    function getSpringCluster(neighborMap) {
        if (!draggedParticle) return new Map();
        const dragIdx = particles.indexOf(draggedParticle);
        if (dragIdx === -1) return new Map();

        const visited = new Map(); // index -> hop count
        const queue = [[dragIdx, 0]];
        visited.set(dragIdx, 0);

        while (queue.length > 0) {
            const [idx, hops] = queue.shift();
            if (hops >= MAX_SPRING_HOPS) continue;
            const nbrs = neighborMap.get(idx);
            if (!nbrs) continue;
            for (const n of nbrs) {
                if (!visited.has(n)) {
                    visited.set(n, hops + 1);
                    queue.push([n, hops + 1]);
                }
            }
        }
        return visited;
    }

    function applySpringPhysics(neighborMap) {
        if (!dragDropPhysics || !isDragging || !draggedParticle) return;

        const cluster = getSpringCluster(neighborMap);

        // Apply spring forces only within the cluster
        for (const [idx, hops] of cluster) {
            if (hops === 0) continue; // skip the pinned particle itself
            const p = particles[idx];
            const forceMult = Math.pow(SPRING_FALLOFF, hops - 1);

            // Find the closest neighbor with fewer hops to pull toward
            const nbrs = neighborMap.get(idx);
            if (!nbrs) continue;

            for (const nIdx of nbrs) {
                const nHops = cluster.get(nIdx);
                if (nHops === undefined || nHops >= hops) continue; // only pull toward closer-to-source

                const target = particles[nIdx];
                const dx = target.x - p.x;
                const dy = target.y - p.y;
                const fx = dx * SPRING_STIFFNESS * forceMult;
                const fy = dy * SPRING_STIFFNESS * forceMult;
                p.vx += fx;
                p.vy += fy;
            }
        }
    }

    function drawConnections() {
        const neighborMap = getNeighborMap();
        const cluster = (dragDropPhysics && isDragging) ? getSpringCluster(neighborMap) : null;

        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < CONNECTION_DIST) {
                    // Highlight lines within the dragged cluster
                    let alpha = (1 - dist / CONNECTION_DIST) * 0.15;
                    let lineWidth = 0.5;
                    if (cluster && cluster.has(i) && cluster.has(j)) {
                        const maxHop = Math.max(cluster.get(i), cluster.get(j));
                        const glow = 1 - (maxHop / (MAX_SPRING_HOPS + 1));
                        alpha = (1 - dist / CONNECTION_DIST) * (0.15 + glow * 0.25);
                        lineWidth = 0.5 + glow * 1.5;
                    }
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},${alpha})`;
                    ctx.lineWidth = lineWidth;
                    ctx.stroke();
                }
            }
        }

        // Apply spring forces after drawing
        applySpringPhysics(neighborMap);
    }

    // Ambient glow blobs
    let time = 0;
    function drawAmbientGlow() {
        time += 0.003;
        // Two slow-drifting glow orbs
        const x1 = W * 0.15 + Math.sin(time * 0.7) * W * 0.08;
        const y1 = H * 0.4 + Math.cos(time * 0.5) * H * 0.15;
        const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, 140);
        grad1.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.06)`);
        grad1.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, W, H);

        const x2 = W * 0.55 + Math.cos(time * 0.4) * W * 0.1;
        const y2 = H * 0.3 + Math.sin(time * 0.6) * H * 0.12;
        const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, 100);
        grad2.addColorStop(0, `rgba(${col.r},${col.g},${col.b},0.035)`);
        grad2.addColorStop(1, `rgba(${col.r},${col.g},${col.b},0)`);
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, W, H);
    }

    function drawHoverIndicator() {
        if (!dragDropPhysics || isDragging || mouseX < 0) return;
        const hit = findParticleAt(mouseX, mouseY);
        if (hit) {
            ctx.beginPath();
            ctx.arc(hit.x, hit.y, GRAB_RADIUS * 0.5, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${col.r},${col.g},${col.b},0.25)`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        drawAmbientGlow();
        particles.forEach(p => { p.update(); p.draw(); });
        drawConnections();
        drawHoverIndicator();
        animId = requestAnimationFrame(animate);
    }

    // Mouse tracking
    function getCanvasMouse(e) {
        const rect = canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function onMouseMove(e) {
        const pos = getCanvasMouse(e);
        mouseX = pos.x;
        mouseY = pos.y;

        // Update cursor when hovering over a particle (drag mode)
        if (dragDropPhysics && !isDragging) {
            const hit = findParticleAt(pos.x, pos.y);
            canvas.style.cursor = hit ? 'grab' : '';
        }
    }
    function onMouseLeave() {
        mouseX = -9999;
        mouseY = -9999;
        if (dragDropPhysics) releaseDrag();
    }

    // Find the closest particle within grab radius
    function findParticleAt(x, y) {
        let closest = null;
        let closestDist = GRAB_RADIUS;
        for (const p of particles) {
            const dx = p.x - x;
            const dy = p.y - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = p;
            }
        }
        return closest;
    }

    function releaseDrag() {
        if (draggedParticle) {
            draggedParticle.pinned = false;
            draggedParticle = null;
        }
        isDragging = false;
        canvas.style.cursor = '';
    }

    // Drag-and-drop handlers
    if (dragDropPhysics) {
        canvas.style.pointerEvents = 'auto';

        canvas.addEventListener('mousedown', (e) => {
            const pos = getCanvasMouse(e);
            const hit = findParticleAt(pos.x, pos.y);
            if (hit) {
                draggedParticle = hit;
                draggedParticle.pinned = true;
                isDragging = true;
                canvas.style.cursor = 'grabbing';
                e.preventDefault();
            }
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) releaseDrag();
        });

        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const pos = getCanvasMouse(touch);
            mouseX = pos.x;
            mouseY = pos.y;
            const hit = findParticleAt(pos.x, pos.y);
            if (hit) {
                draggedParticle = hit;
                draggedParticle.pinned = true;
                isDragging = true;
                e.preventDefault();
            }
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            if (isDragging) {
                const touch = e.touches[0];
                const pos = getCanvasMouse(touch);
                mouseX = pos.x;
                mouseY = pos.y;
                e.preventDefault();
            }
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            releaseDrag();
            mouseX = -9999;
            mouseY = -9999;
        });
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseleave', onMouseLeave);

    window.addEventListener('resize', debounce(() => {
        resize();
        // Re-scatter particles that fell outside bounds
        particles.forEach(p => {
            if (p.x > W || p.y > H) { p.x = Math.random() * W; p.y = Math.random() * H; }
        });
    }, 200));

    resize();
    initParticles();
    animate();

    // Fade in after a beat
    setTimeout(() => canvas.classList.add('active'), 300);
}
