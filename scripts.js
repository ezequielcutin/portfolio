// ===== 1. UTILITY FUNCTIONS =====
let currentTab = null;

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// ===== 2. BOOT SEQUENCE =====
function initBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const bootLines = document.querySelectorAll('.boot-line');
    const progressBar = document.querySelector('.progress-bar');
    const skipBtn = document.getElementById('boot-skip');
    if (!bootScreen) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        bootScreen.style.display = 'none';
        document.querySelector('.container').style.opacity = '1';
        return;
    }
    let skipped = false;
    function skipBoot() {
        if (skipped) return;
        skipped = true;
        bootTimeline.pause();
        anime({ targets: bootScreen, opacity: 0, duration: 200, easing: 'easeOutQuad',
            complete: () => { bootScreen.style.display = 'none'; runEntranceAnimation(); }
        });
    }
    if (skipBtn) skipBtn.addEventListener('click', skipBoot);
    const bootTimeline = anime.timeline({
        easing: 'easeOutQuad',
        complete: () => {
            if (skipped) return;
            anime({ targets: bootScreen, opacity: 0, duration: 300, easing: 'easeOutQuad',
                complete: () => { bootScreen.style.display = 'none'; runEntranceAnimation(); }
            });
        }
    });
    bootLines.forEach((line, i) => {
        const delay = parseInt(line.dataset.delay) || i * 400;
        bootTimeline.add({ targets: line, opacity: [0, 1], translateY: [4, 0], duration: 300 }, delay);
    });
    bootTimeline.add({ targets: progressBar, width: ['0%', '100%'], duration: 2000, easing: 'linear' }, 0);
}

// ===== 3. ENTRANCE ANIMATION =====
function runEntranceAnimation() {
    const container = document.querySelector('.container');
    if (!container) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        container.style.opacity = '1'; return;
    }
    container.style.opacity = '1';
    const elements = [
        container.querySelector('header'),
        container.querySelector('.blurb'),
        container.querySelector('#more-about-me'),
        container.querySelector('.tabs'),
        ...container.querySelectorAll('.entry')
    ].filter(Boolean);
    elements.forEach(el => { el.style.opacity = '0'; el.style.transform = 'translateY(16px)'; });
    anime({
        targets: elements, opacity: [0, 1], translateY: [16, 0], duration: 400,
        delay: anime.stagger(50), easing: 'easeOutCubic',
        complete: () => { elements.forEach(el => { el.style.opacity = ''; el.style.transform = ''; }); }
    });
}

// ===== 4. TAB SWITCHING =====
function showTab(tabName, pushState) {
    const panelMap = {
        'work': 'panel-work',
        'projects': 'panel-projects',
        'music': 'panel-music'
    };

    // "home" means show the about-me section, no tab active
    const isHome = !tabName || tabName === 'home';
    const panelId = isHome ? 'more-about-me' : panelMap[tabName];
    if (!panelId) return;

    // Lazy-init SoundCloud on first music tab visit
    if (!scInitialized && tabName === 'music') {
        scInitialized = true;
        initSoundCloudCards();
    }

    // Update URL hash (unless called from popstate)
    if (pushState !== false) {
        const hash = isHome ? '' : '#' + tabName;
        if (window.location.hash !== hash) {
            history.pushState(null, '', hash || window.location.pathname);
        }
    }

    // Update tab button states
    const allTabs = document.querySelectorAll('.tab');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
        tab.setAttribute('aria-selected', 'false');
    });
    if (!isHome) {
        const clickedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
        if (clickedTab) {
            clickedTab.classList.add('active');
            clickedTab.setAttribute('aria-selected', 'true');
        }
    }

    const allPanels = document.querySelectorAll('.content');
    const currentPanel = document.querySelector('.content.active');
    const nextPanel = document.getElementById(panelId);

    if (!nextPanel) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // First load or reduced motion: instant switch
    if (!currentPanel || reducedMotion || currentTab === null) {
        allPanels.forEach(p => p.classList.remove('active'));
        nextPanel.classList.add('active');
        currentTab = tabName || 'home';
        document.dispatchEvent(new CustomEvent('visualizer-tab-change', { detail: tabName }));
        return;
    }

    // Same panel clicked
    if (currentPanel.id === panelId) return;

    // Lock container height during transition
    const container = document.querySelector('.tab-content-area') || currentPanel.parentElement;
    if (container) {
        container.style.minHeight = container.offsetHeight + 'px';
    }

    // Fade out current
    anime({
        targets: currentPanel, opacity: [1, 0], translateY: [0, -10], duration: 100, easing: 'easeOutQuad',
        complete: () => {
            allPanels.forEach(p => p.classList.remove('active'));
            nextPanel.style.opacity = '0';
            nextPanel.classList.add('active');
            // Fade in next
            anime({
                targets: nextPanel, opacity: [0, 1], translateY: [10, 0], duration: 100, easing: 'easeOutQuad',
                complete: () => {
                    nextPanel.style.opacity = '';
                    nextPanel.style.transform = '';
                    currentPanel.style.opacity = '';
                    currentPanel.style.transform = '';
                    if (container) container.style.minHeight = '';
                }
            });
        }
    });

    currentTab = tabName || 'home';
    document.dispatchEvent(new CustomEvent('visualizer-tab-change', { detail: tabName }));
}

// ===== 4b. HASH ROUTING =====
function initRouting() {
    // Handle back/forward navigation
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.replace('#', '');
        showTab(hash || 'home', false);
    });
}

function getInitialTab() {
    const hash = window.location.hash.replace('#', '');
    if (['work', 'projects', 'music'].includes(hash)) return hash;
    return 'home';
}

// ===== 5. TAB KEYBOARD NAVIGATION =====
function initTabKeyboard() {
    const tabList = document.querySelector('[role="tablist"]') || document.querySelector('.tabs');
    if (!tabList) return;
    const tabs = Array.from(tabList.querySelectorAll('.tab'));
    if (tabs.length === 0) return;

    tabList.addEventListener('keydown', (e) => {
        const currentIndex = tabs.indexOf(document.activeElement);
        if (currentIndex === -1) return;
        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = (currentIndex + 1) % tabs.length;
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        tabs[newIndex].focus();
        tabs[newIndex].click();
    });
}

// ===== 6. ACCORDION TOGGLE =====
function toggleDropdown(buttonEl) {
    const entry = buttonEl.closest('.entry');
    if (!entry) return;
    const dropdown = entry.querySelector('.dropdown');
    if (!dropdown) return;
    const isOpen = dropdown.classList.contains('open');
    const expanded = !isOpen;

    dropdown.classList.toggle('open', expanded);
    buttonEl.setAttribute('aria-expanded', String(expanded));
    dropdown.setAttribute('aria-hidden', String(!expanded));
}

// ===== 6b. OPEN SPECIFIC ENTRY FROM HOME =====
function openEntry(tabName, dropdownId) {
    showTab(tabName);
    // Wait for tab panel to become visible, then open the dropdown and scroll
    requestAnimationFrame(() => {
        setTimeout(() => {
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) return;
            const entry = dropdown.closest('.entry');
            if (!entry) return;
            const btn = entry.querySelector('.entry-header');
            // Open if not already open
            if (!dropdown.classList.contains('open')) {
                dropdown.classList.add('open');
                dropdown.setAttribute('aria-hidden', 'false');
                if (btn) btn.setAttribute('aria-expanded', 'true');
            }
            // Scroll entry into view
            entry.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 220); // after tab fade transition
    });
}

// ===== 7. SCROLL REVEALS =====
function initScrollReveals() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const entries = document.querySelectorAll('.entry');
    if (entries.length === 0) return;

    const observer = new IntersectionObserver((items) => {
        items.forEach(item => {
            if (item.isIntersecting) {
                anime({
                    targets: item.target,
                    translateY: [20, 0],
                    opacity: [0, 1],
                    duration: 400,
                    easing: 'easeOutCubic',
                    complete: () => {
                        item.target.style.opacity = '';
                        item.target.style.transform = '';
                    }
                });
                observer.unobserve(item.target);
            }
        });
    }, { threshold: 0.1 });

    entries.forEach((entry, i) => {
        if (i > 3) {
            entry.style.opacity = '0';
            observer.observe(entry);
        }
    });
}

// ===== 7b. ENTRY HOVER ANIMATIONS (WORK & PROJECT CARDS) =====
function initEntryHoverAnimations() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (typeof anime === 'undefined') return;

    const cards = document.querySelectorAll('#panel-work .entry, #panel-projects .entry');
    if (!cards.length) return;

    cards.forEach((card) => {
        let hoverAnimation = null;
        let leaveAnimation = null;

        card.addEventListener('mouseenter', () => {
            if (leaveAnimation) {
                leaveAnimation.pause();
                leaveAnimation = null;
            }
            hoverAnimation = anime({
                targets: card,
                translateY: -4,
                scale: 1.015,
                duration: 220,
                easing: 'easeOutCubic'
            });
        });

        card.addEventListener('mouseleave', () => {
            if (hoverAnimation) {
                hoverAnimation.pause();
                hoverAnimation = null;
            }
            leaveAnimation = anime({
                targets: card,
                translateY: 0,
                scale: 1,
                duration: 200,
                easing: 'easeOutQuad'
            });
        });
    });
}

// ===== 8. CURSOR TRAIL =====
function initCursorTrail() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = document.getElementById('cursor-trail');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles = [];
    const maxParticles = 40;
    let frameCount = 0;

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', debounce(resize, 200));

    document.addEventListener('mousemove', (e) => {
        if (particles.length >= maxParticles) particles.shift();
        particles.push({
            x: e.clientX + (Math.random() - 0.5) * 4,
            y: e.clientY + (Math.random() - 0.5) * 4,
            life: 1,
            size: 1 + Math.random() * 1.5
        });
    });

    // Cache accent color, update every 60 frames
    let r = 68, g = 136, b = 255;
    function updateAccentColor() {
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#4488ff';
        r = parseInt(accent.slice(1, 3), 16) || 68;
        g = parseInt(accent.slice(3, 5), 16) || 136;
        b = parseInt(accent.slice(5, 7), 16) || 255;
    }
    updateAccentColor();

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (++frameCount % 60 === 0) updateAccentColor();

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.life -= 0.03;
            p.y += 0.2;
            if (p.life <= 0) {
                particles.splice(i, 1);
                continue;
            }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.life * 0.15})`;
            ctx.fill();
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// ===== 9. CAROUSEL =====
function initCarousel(carousel) {
    const slides = carousel.querySelectorAll('.carousel__slide');
    const prevBtn = carousel.querySelector('.carousel__btn--prev');
    const nextBtn = carousel.querySelector('.carousel__btn--next');
    const counter = carousel.querySelector('.carousel__counter');
    const total = slides.length;
    let current = 0;
    let animating = false;

    function goTo(idx, animate = true) {
        const next = (idx + total) % total;
        if (next === current || animating) return;

        const outSlide = slides[current];
        const inSlide = slides[next];
        const direction = idx > current || (current === total - 1 && next === 0) ? 1 : -1;

        if (!animate) {
            outSlide.classList.remove('is-active');
            inSlide.classList.add('is-active');
            current = next;
            counter.textContent = (current + 1) + ' of ' + total;
            return;
        }

        animating = true;

        const track = carousel.querySelector('.carousel__track');
        const outHeight = outSlide.offsetHeight;

        // Position incoming slide offscreen to measure its natural height
        inSlide.style.position = 'absolute';
        inSlide.style.top = '0';
        inSlide.style.left = '0';
        inSlide.style.width = '100%';
        inSlide.style.opacity = '0';
        inSlide.classList.add('is-active');

        // Wait for image to load (if not cached) before measuring
        const img = inSlide.querySelector('img');
        const measure = () => {
            const inHeight = inSlide.offsetHeight;

            // Lock track height to prevent layout jump
            track.style.height = outHeight + 'px';

            // Animate track height if different
            if (Math.abs(inHeight - outHeight) > 1) {
                anime({
                    targets: track,
                    height: [outHeight, inHeight],
                    duration: 400,
                    easing: 'easeInOutQuad',
                });
            }

            // Animate out old, animate in new
            anime({
                targets: outSlide,
                opacity: [1, 0],
                translateX: [0, -30 * direction],
                duration: 400,
                easing: 'easeInOutQuad',
            });

            anime({
                targets: inSlide,
                opacity: [0, 1],
                translateX: [30 * direction, 0],
                duration: 400,
                easing: 'easeInOutQuad',
                complete: () => {
                    outSlide.classList.remove('is-active');
                    outSlide.style.opacity = '';
                    outSlide.style.transform = '';
                    inSlide.style.position = '';
                    inSlide.style.top = '';
                    inSlide.style.left = '';
                    inSlide.style.width = '';
                    inSlide.style.opacity = '';
                    inSlide.style.transform = '';
                    track.style.height = '';
                    current = next;
                    counter.textContent = (current + 1) + ' of ' + total;
                    animating = false;
                }
            });
        };

        if (img && !img.complete) {
            img.addEventListener('load', measure, { once: true });
        } else {
            measure();
        }
    }

    // Show first slide immediately
    slides[0].classList.add('is-active');
    counter.textContent = '1 of ' + total;

    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current - 1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); goTo(current + 1); });

    // Keyboard nav
    carousel.setAttribute('tabindex', '0');
    carousel.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
    });
}

function initCarousels() {
    document.querySelectorAll('.carousel').forEach(initCarousel);
}

// ===== 10. KONAMI CODE =====
function initKonamiCode() {
    const konamiCode = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    let konamiIndex = 0;

    document.addEventListener('keydown', (e) => {
        if (e.code === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                toggleSecretMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    function toggleSecretMode() {
        const isNowActive = document.body.classList.toggle('secret-mode');
        showSecretNotification(isNowActive);
    }

    function showSecretNotification(activated) {
        const notification = document.createElement('div');
        notification.className = 'secret-mode-notification';
        notification.innerHTML = activated
            ? `<h2>SECRET MODE ACTIVATED</h2><p>Press Konami code again to deactivate</p>`
            : `<h2>SECRET MODE DEACTIVATED</h2>`;
        notification.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            padding: 24px 40px; z-index: 100000; text-align: center;
            background: rgba(0, 0, 0, 0.9); border: 1px solid var(--accent, #4488ff);
            color: var(--accent, #4488ff); font-family: inherit; border-radius: 8px;
            pointer-events: none; animation: fadeInOut 2.5s ease forwards;
        `;

        if (!document.getElementById('secret-notif-keyframes')) {
            const style = document.createElement('style');
            style.id = 'secret-notif-keyframes';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.95); }
                    15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    75% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2500);
    }
}

// ===== 11. CONSOLE EASTER EGGS =====
function initConsoleEasterEgg() {
    const asciiArt = `
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║                    ╔══════════════════════════════════════╗  ║
    ║                    ║  Ezequiel Cutin                      ║  ║
    ║                    ║  Software Engineer | Data Analyst    ║  ║
    ║                    ║  Sales Engineer | Music Producer     ║  ║
    ║                    ╚══════════════════════════════════════╝  ║
    ║                                                              ║
    ║  Greetings, fellow dev. You've accessed the mainframe.       ║
    ║  Type 'help()' for console commands.                         ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    `;

    console.log('%c' + asciiArt, 'color: #4488ff; font-family: monospace; font-size: 8px;');
    console.log('%cWelcome to the secret terminal! Type help() for commands.', 'color: #4488ff; font-size: 14px; font-weight: bold;');

    window.help = function() {
        console.log('%cAvailable commands:', 'color: #44ccff; font-weight: bold;');
        console.log('%c  contact() - Get contact information', 'color: #4488ff;');
        console.log('%c  projects() - View project links', 'color: #4488ff;');
        console.log('%c  skills() - Show technical skills', 'color: #4488ff;');
        console.log('%c  secret() - Reveal a secret message', 'color: #4488ff;');
        console.log('%c  about() - Learn more about Ezequiel', 'color: #4488ff;');
    };

    window.contact = function() {
        console.log('%c📧 Contact Information:', 'color: #44ccff; font-weight: bold;');
        console.log('%c  Email: ezequielcutin@gmail.com', 'color: #4488ff;');
        console.log('%c  LinkedIn: linkedin.com/in/ezequiel-cutin', 'color: #4488ff;');
        console.log('%c  GitHub: github.com/ezequielcutin', 'color: #4488ff;');
        console.log('%c  Twitter: @ezecutin', 'color: #4488ff;');
    };

    window.projects = function() {
        console.log('%c🚀 Featured Projects:', 'color: #44ccff; font-weight: bold;');
        console.log('%c  • Job Application Tracker: job-application-tracker-nu.vercel.app', 'color: #4488ff;');
        console.log('%c  • GoBank: github.com/ezequielcutin/gobank', 'color: #4488ff;');
        console.log('%c  • Spotify Track Downloader: github.com/ezequielcutin/spotify-to-mp3', 'color: #4488ff;');
        console.log('%c  • Fractal Mountain: ezequielcutin.github.io/fractal-mountain', 'color: #4488ff;');
        console.log('%c  • Architecture Style Detection: github.com/ezequielcutin/architecture-style-detection', 'color: #4488ff;');
    };

    window.skills = function() {
        console.log('%c💻 Technical Skills:', 'color: #44ccff; font-weight: bold;');
        console.log('%c  Languages: JavaScript, Python, C#, Java, Go, SQL', 'color: #4488ff;');
        console.log('%c  Frontend: React, TypeScript, HTML/CSS, WebGL', 'color: #4488ff;');
        console.log('%c  Backend: Node.js, Express, Flask, .NET Core', 'color: #4488ff;');
        console.log('%c  Databases: PostgreSQL, MongoDB, SQLite', 'color: #4488ff;');
        console.log('%c  Tools: Git, Docker, AWS, Heroku, Vercel', 'color: #4488ff;');
        console.log('%c  AI/ML: PyTorch, TensorFlow, Computer Vision', 'color: #4488ff;');
    };

    window.secret = function() {
        console.log('%c🤫 Secret Message:', 'color: #6644ff; font-weight: bold;');
        console.log('%c  "The best code is the code that makes you smile."', 'color: #6644ff;');
        console.log('%c  - Ezequiel Cutin', 'color: #6644ff;');
        console.log('%c  P.S. You found the easter egg! 🎉', 'color: #6644ff;');
    };

    window.about = function() {
        console.log('%c👨‍💻 About Ezequiel:', 'color: #44ccff; font-weight: bold;');
        console.log('%c  First-generation American with Argentinian roots', 'color: #4488ff;');
        console.log('%c  University of Michigan CS Graduate', 'color: #4488ff;');
        console.log('%c  Passionate about fútbol, hiking, and electronic music', 'color: #4488ff;');
        console.log('%c  Currently working at United Wholesale Mortgage', 'color: #4488ff;');
        console.log('%c  Building the future, one line of code at a time!', 'color: #4488ff;');
    };

    setTimeout(() => {
        if (window.help) {
            console.log('%c💡 Tip: Type help() to see available commands', 'color: #44ccff; font-style: italic;');
        }
    }, 1000);
}

// ===== 12. AUDIO VISUALIZER =====
let audioVisualizerInitialized = false;

function initAudioVisualizer() {
    if (audioVisualizerInitialized) return;

    const canvas = document.getElementById('audio-visualizer');
    const toggle = document.getElementById('visualizer-toggle');

    if (!canvas || !toggle) return;

    audioVisualizerInitialized = true;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationFrame = null;
    let isActive = false;
    let currentMode = 0; // 0: bars, 1: waveform, 2: circular, 3: ambient
    let pendingMode = null;
    let isStartingVisualizer = false;

    const modes = ['bars', 'waveform', 'circular', 'ambient'];
    let timeData = new Uint8Array(0);
    let freqData = new Float32Array(0);

    const controls = document.getElementById('visualizer-controls');
    const modeToggle = document.getElementById('visualizer-mode-toggle');
    const exitToggle = document.getElementById('visualizer-exit');

    function isMusicTabActive() {
        const musicSection = document.getElementById('panel-music');
        return !!musicSection && musicSection.classList.contains('active');
    }

    function setHidden(el, shouldHide) {
        if (!el) return;
        if (shouldHide) {
            el.classList.add('hidden');
        } else {
            el.classList.remove('hidden');
        }
    }

    function updateVisualizerUI() {
        const showMainToggle = isMusicTabActive();
        setHidden(toggle, !showMainToggle);

        if (controls) {
            controls.classList.toggle('active', showMainToggle && isActive);
            controls.setAttribute('aria-hidden', showMainToggle && isActive ? 'false' : 'true');
        }
    }

    function applyModeLabel() {
        const textSpan = toggle.querySelector('.visualizer-toggle-text');
        if (textSpan) {
            textSpan.textContent = modes[currentMode].toUpperCase();
        }
    }

    function cycleMode() {
        const nextMode = (currentMode + 1) % modes.length;

        if (nextMode === 3) {
            pendingMode = null;
            currentMode = 3;
            applyModeLabel();
            if (analyser) {
                if (microphone) {
                    microphone.disconnect();
                    microphone = null;
                }
                if (audioContext) {
                    audioContext.close();
                    audioContext = null;
                }
                analyser = null;
            }
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            drawAmbientVisualizer();
            return;
        }

        if (!analyser) {
            if (isStartingVisualizer) return;
            pendingMode = nextMode;
            const textSpan = toggle.querySelector('.visualizer-toggle-text');
            if (textSpan) {
                textSpan.textContent = modes[nextMode].toUpperCase();
            }
            startVisualizer();
            return;
        }

        pendingMode = null;
        currentMode = nextMode;
        applyModeLabel();
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        drawVisualizer();
    }

    // Get theme colors (adapts to secret mode)
    function getThemeColors() {
        const isSecretMode = document.body.classList.contains('secret-mode');
        if (isSecretMode) {
            return {
                primary: '#ff4488',
                secondary: '#ff6644',
                glow: '#ff4488',
                shadow: 'rgba(255, 68, 136, 0.8)'
            };
        }
        return {
            primary: '#4488ff',
            secondary: '#6644ff',
            glow: '#4488ff',
            shadow: 'rgba(68, 136, 255, 0.8)'
        };
    }

    // Set canvas size
    function resizeCanvas() {
        const width = Math.max(window.innerWidth || 1, 1);
        const height = Math.max(window.innerHeight || 1, 1);
        canvas.width = width;
        canvas.height = height;
    }

    requestAnimationFrame(() => {
        resizeCanvas();
        if (canvas.width === 0 || canvas.height === 0) {
            setTimeout(() => resizeCanvas(), 100);
        }
    });
    window.addEventListener('resize', debounce(resizeCanvas, 100));

    // Request microphone access and initialize audio
    async function startVisualizer() {
        if (isStartingVisualizer) return;
        isStartingVisualizer = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }

            if (pendingMode !== null) {
                currentMode = pendingMode;
                pendingMode = null;
            }

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;

            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            timeData = new Uint8Array(analyser.fftSize);
            freqData = new Float32Array(analyser.frequencyBinCount);

            isActive = true;
            canvas.classList.add('active');
            toggle.classList.add('active');

            applyModeLabel();
            updateVisualizerUI();

            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                isStartingVisualizer = false;
                return;
            }

            drawVisualizer();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            pendingMode = null;
            currentMode = 3;
            isActive = true;
            canvas.classList.add('active');
            toggle.classList.add('active');

            applyModeLabel();
            updateVisualizerUI();

            resizeCanvas();
            if (!animationFrame) {
                drawAmbientVisualizer();
            }
        } finally {
            isStartingVisualizer = false;
        }
    }

    // Stop visualizer and clean up
    function stopVisualizer() {
        isActive = false;
        canvas.classList.remove('active');
        toggle.classList.remove('active');

        const textSpan = toggle.querySelector('.visualizer-toggle-text');
        if (textSpan) {
            textSpan.textContent = 'AUDIO VISUALIZER (EXPERIMENTAL)';
        }

        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }

        if (microphone) {
            microphone.disconnect();
            microphone = null;
        }

        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }

        analyser = null;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateVisualizerUI();
    }

    // Draw frequency bars - FULL WIDTH SPECTRUM ANALYZER
    function drawBars() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        analyser.getFloatFrequencyData(freqData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        const minDb = analyser.minDecibels;
        const maxDb = analyser.maxDecibels;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barCount = 96;
        const barWidth = canvas.width / barCount;
        const barSpacing = 1;
        const freqBins = freqData.length;
        if (freqBins === 0) return;

        const processedData = [];
        let energySum = 0;

        for (let i = 0; i < barCount; i++) {
            const normalizedPos = i / (barCount - 1);
            const logIndex = Math.pow(normalizedPos, 2.2) * (freqBins - 1);
            const dataIndex = Math.floor(logIndex);
            const nextIndex = Math.min(dataIndex + 1, freqBins - 1);
            const fraction = logIndex - dataIndex;

            const dbValue = freqData[dataIndex] * (1 - fraction) + freqData[nextIndex] * fraction;
            let norm = (dbValue - minDb) / (maxDb - minDb);
            norm = Math.max(0, Math.min(1, norm));

            norm = Math.pow(norm, 0.7);
            if (norm < 0.03) norm = 0;
            const tilt = 0.8 + Math.pow(normalizedPos, 0.5) * 2.0;
            const value = Math.min(1, norm * tilt);

            processedData.push(value);
            energySum += value;
        }

        const avgEnergy = energySum / barCount;
        const gain = avgEnergy > 0 ? Math.min(2.5, 0.6 / avgEnergy) : 1;

        const smoothedData = [];
        const smoothWindow = 2;
        for (let i = 0; i < barCount; i++) {
            let sum = 0;
            let count = 0;
            for (let j = -smoothWindow; j <= smoothWindow; j++) {
                const idx = i + j;
                if (idx >= 0 && idx < barCount) {
                    sum += processedData[idx] * gain;
                    count++;
                }
            }
            smoothedData.push(Math.min(1, sum / count));
        }

        const avgValue = smoothedData.reduce((a, b) => a + b, 0) / barCount;

        for (let i = 0; i < barCount; i++) {
            const intensity = smoothedData[i];
            const normalizedPos = i / (barCount - 1);

            const centerDistance = Math.abs(normalizedPos - 0.5) * 2;
            const minHeight = 4 + (1 - centerDistance) * 12;
            const maxHeight = canvas.height - 4;
            const barHeight = Math.min(maxHeight, minHeight + intensity * (canvas.height * 0.8));

            const hueProgress = normalizedPos;
            const r = Math.floor(primaryRgb.r * (1 - hueProgress * 0.3));
            const g = primaryRgb.g;
            const b = Math.floor(primaryRgb.b + hueProgress * 80);

            const x = i * barWidth;
            const y = Math.max(0, canvas.height - barHeight);

            let gradient;
            try {
                gradient = ctx.createLinearGradient(0, canvas.height, 0, y);
                gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
                gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`);
                gradient.addColorStop(1, `rgba(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)}, 1)`);
            } catch (e) {
                continue;
            }

            ctx.fillStyle = gradient;

            if (intensity > 0.5) {
                ctx.shadowBlur = 8 + intensity * 12;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${intensity * 0.7})`;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.fillRect(x + barSpacing, y, barWidth - barSpacing * 2, barHeight);
        }

        ctx.shadowBlur = 0;
        const reflectionGradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - 50);
        reflectionGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.05 + avgValue * 0.12})`);
        reflectionGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = reflectionGradient;
        ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
    }

    // Helper function to convert hex to RGB
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 68, g: 136, b: 255 };
    }

    // Draw waveform - MULTI-LAYERED VERSION
    function drawWaveform() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        analyser.getByteTimeDomainData(timeData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerY = canvas.height / 2;

        let totalAmplitude = 0;
        for (let i = 0; i < timeData.length; i++) {
            totalAmplitude += Math.abs(timeData[i] - 128);
        }
        const avgAmplitude = totalAmplitude / timeData.length;
        const amplitudeNormalized = avgAmplitude / 128;

        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const layers = [
            { offset: 0, alpha: 1, width: 3, scale: 1 },
            { offset: 0.2, alpha: 0.4, width: 2, scale: 0.6 }
        ];

        layers.forEach((layer, layerIndex) => {
            ctx.beginPath();
            ctx.lineWidth = layer.width + amplitudeNormalized * 2;

            const hueShift = layerIndex * 30;
            ctx.strokeStyle = `rgba(${Math.min(255, primaryRgb.r + hueShift)}, ${primaryRgb.g}, ${Math.min(255, primaryRgb.b + hueShift)}, ${layer.alpha})`;

            if (layerIndex === 0 && amplitudeNormalized > 0.3) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = colors.glow;
            } else {
                ctx.shadowBlur = 0;
            }

            const sliceWidth = canvas.width / Math.max(timeData.length - 1, 1);
            let x = 0;
            let prevX = 0;
            let prevY = centerY;

            for (let i = 0; i < timeData.length; i++) {
                const left = timeData[i - 1] ?? timeData[i];
                const right = timeData[i + 1] ?? timeData[i];
                const smoothed = (left + timeData[i] + right) / 3;

                const v = (smoothed - 128) / 128.0;
                const heightScale = canvas.height * 0.4 * layer.scale;
                const y = centerY + v * heightScale;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    const midX = (prevX + x) / 2;
                    const midY = (prevY + y) / 2;
                    ctx.quadraticCurveTo(prevX, prevY, midX, midY);
                }

                prevX = x;
                prevY = y;
                x += sliceWidth;
            }

            ctx.lineTo(prevX, prevY);
            ctx.stroke();
        });

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();
    }

    // Draw circular visualization - SYMMETRIC VERSION
    let circularRotation = 0;
    function drawCircular() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        analyser.getFloatFrequencyData(freqData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        const minDb = analyser.minDecibels;
        const maxDb = analyser.maxDecibels;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = Math.min(canvas.width, canvas.height) * 0.1;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.42;

        const numBars = 48;
        const freqBins = freqData.length;
        if (freqBins === 0) return;

        const processedData = [];
        for (let i = 0; i < numBars; i++) {
            const normalizedPos = i / (numBars - 1);
            const logIndex = Math.pow(normalizedPos, 2.0) * (freqBins - 1);
            const dataIndex = Math.floor(logIndex);
            const nextIndex = Math.min(dataIndex + 1, freqBins - 1);
            const fraction = logIndex - dataIndex;

            const dbValue = freqData[dataIndex] * (1 - fraction) + freqData[nextIndex] * fraction;
            let norm = (dbValue - minDb) / (maxDb - minDb);
            norm = Math.max(0, Math.min(1, norm));

            norm = Math.pow(norm, 0.7);
            if (norm < 0.04) norm = 0;
            const tilt = 0.9 + Math.pow(normalizedPos, 0.6) * 1.8;
            processedData.push(Math.min(1, norm * tilt));
        }

        const avgValue = processedData.reduce((a, b) => a + b, 0) / processedData.length;
        const avgNormalized = avgValue;
        const isQuiet = avgNormalized < 0.05;
        const pulseScale = 0.85 + avgNormalized * 0.3;

        circularRotation += 0.008 + avgNormalized * 0.012;

        const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * pulseScale * 1.5);
        centerGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.2 + avgNormalized * 0.2})`);
        centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerGradient;
        ctx.fillRect(centerX - baseRadius * 2, centerY - baseRadius * 2, baseRadius * 4, baseRadius * 4);

        const innerRadius = baseRadius * pulseScale;

        for (let i = 0; i < numBars; i++) {
            const value = processedData[i];
            const intensity = value;

            const halfAngle = (i / numBars) * Math.PI;
            const angle1 = halfAngle + circularRotation;
            const angle2 = -halfAngle + circularRotation + Math.PI;

            if (isQuiet && intensity === 0) continue;
            const minLength = isQuiet ? 0 : 2 + avgNormalized * 8;
            const energyScale = 0.25 + avgNormalized * 0.75;
            const barLength = minLength + intensity * (maxRadius - baseRadius) * energyScale;

            const hueShift = (i / numBars) * 50;
            const r = Math.min(255, primaryRgb.r + hueShift);
            const g = primaryRgb.g;
            const b = Math.min(255, primaryRgb.b - hueShift * 0.4);

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`;
            ctx.lineWidth = 2 + intensity * 2;

            if (intensity > 0.6) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            } else {
                ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle1) * innerRadius, centerY + Math.sin(angle1) * innerRadius);
            ctx.lineTo(centerX + Math.cos(angle1) * (innerRadius + barLength), centerY + Math.sin(angle1) * (innerRadius + barLength));
            ctx.moveTo(centerX + Math.cos(angle2) * innerRadius, centerY + Math.sin(angle2) * innerRadius);
            ctx.lineTo(centerX + Math.cos(angle2) * (innerRadius + barLength), centerY + Math.sin(angle2) * (innerRadius + barLength));
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
    }

    // Draw ambient animation (no audio input)
    let ambientTime = 0;
    function drawAmbientVisualizer() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }
        ambientTime += 0.02;
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.38;

        const rings = [
            { radius: 0.4, bars: 40, speed: 0.8, direction: 1 },
            { radius: 0.85, bars: 56, speed: 0.4, direction: -1 }
        ];

        const time2 = ambientTime * 2;
        const time1_5 = ambientTime * 1.5;

        rings.forEach((ring, ringIndex) => {
            const baseRadius = maxRadius * ring.radius;
            const barCount = ring.bars;
            const rotationOffset = ambientTime * ring.speed * ring.direction;

            const hueShift = ringIndex * 20;
            const r = Math.min(255, primaryRgb.r + hueShift);
            const g = primaryRgb.g;
            const b = Math.min(255, primaryRgb.b - hueShift * 0.3);

            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
            ctx.lineWidth = 3;

            ctx.beginPath();

            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2 + rotationOffset;

                const wave = Math.sin(time2 + i * 0.25) * 0.5 +
                            Math.sin(time1_5 + i * 0.15 + ringIndex * 2) * 0.5;
                const pulse = (wave + 1) / 2;

                const minLength = 15 + ringIndex * 10;
                const barLength = minLength + pulse * (30 + ringIndex * 25);

                const x1 = centerX + Math.cos(angle) * baseRadius;
                const y1 = centerY + Math.sin(angle) * baseRadius;
                const x2 = centerX + Math.cos(angle) * (baseRadius + barLength);
                const y2 = centerY + Math.sin(angle) * (baseRadius + barLength);

                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
            }

            ctx.stroke();
        });

        const centerPulse = (Math.sin(ambientTime * 2) + 1) / 2;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 50 + centerPulse * 20);
        gradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.2 + centerPulse * 0.15})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(centerX - 80, centerY - 80, 160, 160);

        if (isActive && currentMode === 3) {
            animationFrame = requestAnimationFrame(drawAmbientVisualizer);
        }
    }

    // Main draw loop
    function drawVisualizer() {
        if (!isActive) return;

        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) return;
        }

        if (analyser && currentMode !== 3) {
            switch (currentMode) {
                case 0: drawBars(); break;
                case 1: drawWaveform(); break;
                case 2: drawCircular(); break;
            }
        } else if (currentMode === 3) {
            drawAmbientVisualizer();
            return;
        }

        animationFrame = requestAnimationFrame(drawVisualizer);
    }

    // Click handling with delay to detect double-click
    let clickTimeout = null;
    let clickCount = 0;

    toggle.addEventListener('click', (e) => {
        if (isStartingVisualizer) return;

        clickCount++;

        if (clickCount === 1) {
            clickTimeout = setTimeout(() => {
                if (!isActive) {
                    startVisualizer();
                } else {
                    stopVisualizer();
                }
                clickCount = 0;
            }, 250);
        } else if (clickCount === 2) {
            clearTimeout(clickTimeout);
            clickCount = 0;

            if (isActive) {
                cycleMode();
            } else {
                cycleMode();
            }
        }
    });

    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            if (isStartingVisualizer) return;
            if (!isActive) {
                startVisualizer();
                return;
            }
            cycleMode();
        });
    }

    if (exitToggle) {
        exitToggle.addEventListener('click', () => {
            stopVisualizer();
        });
    }

    document.addEventListener('visualizer-tab-change', (event) => {
        if (event.detail !== 'music') {
            if (isActive) {
                stopVisualizer();
            }
        }
        updateVisualizerUI();
    });

    updateVisualizerUI();
}

// ===== 12b. SOUNDCLOUD CUSTOM CARDS (oEmbed + Widget API) =====
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function formatScTime(ms) {
    if (ms == null || !isFinite(ms) || ms < 0) return '0:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
}

/** Duration in ms for scrub preview (widget metadata or parsed total label) */
function getScTrackDurationMs(card) {
    var d = parseInt(card.dataset.scDuration, 10);
    if (d > 0) return d;
    var totalEl = card.querySelector('.sc-track-card__total');
    if (!totalEl) return 0;
    var parts = String(totalEl.textContent || '')
        .trim()
        .split(':')
        .map(function (x) {
            return parseInt(x, 10) || 0;
        });
    if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
    if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
    return 0;
}

function buildScTrackCardMarkup(card, { title, artist, thumb, openUrl }) {
    const art = thumb
        ? `<img class="sc-track-card__img" src="${escapeHtml(thumb)}" alt="" width="160" height="160" loading="lazy" decoding="async">`
        : '<div class="sc-track-card__art-fallback" aria-hidden="true"></div>';
    const open = openUrl
        ? `<a class="sc-track-card__open" href="${escapeHtml(openUrl)}" target="_blank" rel="noopener noreferrer">Open in SoundCloud <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>`
        : '';

    // Generate 16 waveform bars with random heights persisted for card lifetime
    let waveformBars = '';
    for (let i = 0; i < 16; i++) {
        const h = Math.floor(Math.random() * 71) + 20; // 20-90%
        waveformBars += '<div class="waveform-bar" style="height:' + h + '%"></div>';
    }

    card.innerHTML =
        '<div class="sc-track-card__art">' + art + '</div>' +
        '<div class="sc-track-card__body">' +
        '<h3 class="sc-track-card__title">' + escapeHtml(title) + '</h3>' +
        '<p class="sc-track-card__artist">' + escapeHtml(artist) + '</p>' +
        '<div class="sc-track-card__waveform" role="slider" tabindex="0" ' +
        'aria-label="Seek in track" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-valuetext="0:00">' +
        '<span class="sc-track-card__scrub-hint" aria-hidden="true"></span>' +
        waveformBars + '</div>' +
        '<div class="sc-track-card__times">' +
        '<span class="sc-track-card__elapsed">0:00</span>' +
        '<span class="sc-track-card__total">0:00</span></div>' +
        '<div class="sc-track-card__controls">' +
        '<button type="button" class="sc-track-card__play" aria-label="Play track"><i class="fas fa-play" aria-hidden="true"></i></button>' +
        (open ? open : '<span class="sc-track-card__meta sc-track-card__meta--dynamic"></span>') +
        '</div></div>';
}

/** True if widget sound object belongs to this card's track URL (avoids stale metadata after track switch). */
function scSoundMatchesCard(sound, trackUrl) {
    if (!sound || !trackUrl) return false;
    var idM = trackUrl.match(/tracks\/(\d+)/i);
    if (idM && sound.id != null && String(sound.id) === idM[1]) return true;
    var perm = (sound.permalink_url || '').toLowerCase().replace(/\/$/, '').split('?')[0];
    var cardU = trackUrl.toLowerCase().replace(/\/$/, '').split('?')[0];
    if (cardU.indexOf('api.soundcloud') !== -1) return !!idM && sound.id != null && String(sound.id) === idM[1];
    if (!perm || cardU.indexOf('soundcloud.com') === -1) return false;
    var pathSound = perm.split('soundcloud.com')[1] || '';
    var pathCard = cardU.split('soundcloud.com')[1] || '';
    pathSound = pathSound.replace(/^\//, '');
    pathCard = pathCard.replace(/^\//, '');
    return pathSound.length > 0 && pathCard.length > 0 && pathSound === pathCard;
}

function applySoundMetadata(card, sound) {
    if (!sound) return;
    const titleEl = card.querySelector('.sc-track-card__title');
    const artistEl = card.querySelector('.sc-track-card__artist');
    const artWrap = card.querySelector('.sc-track-card__art');
    if (titleEl && sound.title) titleEl.textContent = sound.title;
    if (artistEl && sound.user && sound.user.username) artistEl.textContent = sound.user.username;
    if (artWrap && sound.artwork_url && !artWrap.querySelector('.sc-track-card__img')) {
        const u = sound.artwork_url.replace('-large', '-t300x300');
        artWrap.innerHTML = '<img class="sc-track-card__img" src="' + escapeHtml(u) + '" alt="" width="160" height="160" loading="lazy" decoding="async">';
    }
    if (sound.duration) card.dataset.scDuration = String(sound.duration);
    if (sound.permalink_url && !card.dataset.scOpen) {
        const meta = card.querySelector('.sc-track-card__meta--dynamic');
        if (meta) {
            meta.outerHTML =
                '<a class="sc-track-card__open" href="' + escapeHtml(sound.permalink_url) +
                '" target="_blank" rel="noopener noreferrer">Open in SoundCloud <i class="fas fa-external-link-alt" aria-hidden="true"></i></a>';
        }
    }
}

let scInitialized = false;
function initSoundCloudCardsOnFirstVisit() {
    // Init immediately if music tab is active from URL hash
    if (window.location.hash === '#music') {
        scInitialized = true;
        initSoundCloudCards();
    }
}

function initSoundCloudCards() {
    const iframe = document.getElementById('sc-widget-iframe');
    const cards = Array.prototype.slice.call(document.querySelectorAll('.sc-track-card'));
    if (!iframe || !cards.length) return;

    if (typeof SC === 'undefined' || !SC.Widget) {
        cards.forEach(function (c) {
            c.classList.remove('sc-track-card--loading');
            c.innerHTML = '<p class="sc-track-card__error">SoundCloud player could not load. <a href="' +
                escapeHtml(c.dataset.scUrl) + '" target="_blank" rel="noopener">Open track</a></p>';
        });
        return;
    }

    const widgetParams =
        'color=4488ff&auto_play=false&hide_related=true&show_comments=false&sharing=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&buying=false&download=false';
    const firstUrl = cards[0].dataset.scUrl;
    iframe.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(firstUrl) + '&' + widgetParams;

    const widget = SC.Widget(iframe);
    let playingCard = null;
    /** URL currently buffered in the widget (initial iframe + prefetch + last load) */
    let lastLoadedUrl = firstUrl;
    let readyNonce = 0;
    let prefetchGen = 0;
    let metadataSyncId = 0;
    const prefetchEnabled =
        typeof navigator === 'undefined' ||
        !navigator.connection ||
        !navigator.connection.saveData;
    const allowPrefetch = function () {
        return prefetchEnabled && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    };
    /** After seek, widget can report old position briefly; hold UI at target until playback catches up */
    let seekHoldMs = null;
    let seekHoldStarted = 0;

    function resetProgressUi(card) {
        if (!card) return;
        const bars = card.querySelectorAll('.waveform-bar');
        bars.forEach(function (b) { b.classList.remove('waveform-bar--active'); });
        const elapsed = card.querySelector('.sc-track-card__elapsed');
        const total = card.querySelector('.sc-track-card__total');
        const waveform = card.querySelector('.sc-track-card__waveform');
        if (elapsed) elapsed.textContent = '0:00';
        if (total) total.textContent = formatScTime(parseInt(card.dataset.scDuration, 10) || 0);
        if (waveform) {
            waveform.setAttribute('aria-valuenow', '0');
            waveform.setAttribute('aria-valuetext', '0:00');
        }
    }

    function syncMetadataWhenReady(card, expectedUrl) {
        var sid = ++metadataSyncId;
        function tryApply() {
            if (metadataSyncId !== sid || playingCard !== card) return;
            widget.getCurrentSound(function (sound) {
                if (metadataSyncId !== sid || playingCard !== card) return;
                if (!scSoundMatchesCard(sound, expectedUrl)) return;
                applySoundMetadata(card, sound);
                var tEl = card.querySelector('.sc-track-card__total');
                if (tEl && sound.duration) tEl.textContent = formatScTime(sound.duration);
            });
        }
        [60, 200, 450, 800].forEach(function (ms) {
            setTimeout(tryApply, ms);
        });
    }

    function syncPlayIcons() {
        document.querySelectorAll('.sc-track-card__play').forEach(function (btn) {
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'fas fa-play';
        });
        widget.isPaused(function (paused) {
            if (!paused && playingCard) {
                const icon = playingCard.querySelector('.sc-track-card__play i');
                if (icon) icon.className = 'fas fa-pause';
                playingCard.classList.add('sc-track-card--playing');
            } else {
                document.querySelectorAll('.sc-track-card').forEach(function (c) {
                    c.classList.remove('sc-track-card--playing');
                });
            }
        });
    }

    function applyProgressUi(card, currentMs, durationMs) {
        const d = durationMs || parseInt(card.dataset.scDuration, 10) || 0;
        if (d <= 0) return;
        const rel = Math.min(1, Math.max(0, currentMs / d));
        const bars = card.querySelectorAll('.waveform-bar');
        const activeCount = Math.round(rel * bars.length);
        bars.forEach(function (b, i) {
            if (i < activeCount) {
                b.classList.add('waveform-bar--active');
            } else {
                b.classList.remove('waveform-bar--active');
            }
        });
        const elapsed = card.querySelector('.sc-track-card__elapsed');
        const total = card.querySelector('.sc-track-card__total');
        const waveform = card.querySelector('.sc-track-card__waveform');
        if (elapsed) elapsed.textContent = formatScTime(currentMs);
        if (total) total.textContent = formatScTime(d);
        if (waveform) {
            waveform.setAttribute('aria-valuenow', String(Math.round(rel * 100)));
            waveform.setAttribute('aria-valuetext', formatScTime(currentMs) + ' of ' + formatScTime(d));
        }
    }

    widget.bind(SC.Widget.Events.PLAY_PROGRESS, function (e) {
        if (!playingCard || !e) return;
        var card = playingCard;
        if (e.duration && e.duration > 0) {
            card.dataset.scDuration = String(e.duration);
        }
        var d = e.duration || parseInt(card.dataset.scDuration, 10) || 0;
        if (
            d <= 0 &&
            typeof e.relativePosition === 'number' &&
            e.relativePosition >= 0.04 &&
            e.currentPosition > 0
        ) {
            var est = Math.round(e.currentPosition / e.relativePosition);
            if (est > 2000 && est < 7200000) {
                d = est;
                card.dataset.scDuration = String(d);
            }
        }

        if (typeof e.relativePosition === 'number') {
            var bars = card.querySelectorAll('.waveform-bar');
            var activeCount = Math.round(e.relativePosition * bars.length);
            bars.forEach(function (b, i) {
                if (i < activeCount) b.classList.add('waveform-bar--active');
                else b.classList.remove('waveform-bar--active');
            });
        }

        if (seekHoldMs != null && d > 0) {
            var drift = Math.abs(e.currentPosition - seekHoldMs);
            var timedOut = Date.now() - seekHoldStarted > 3500;
            if (drift < 1200 || timedOut) {
                seekHoldMs = null;
            } else {
                applyProgressUi(card, seekHoldMs, d);
                return;
            }
        }
        if (typeof e.relativePosition === 'number' && d > 0) {
            applyProgressUi(card, e.currentPosition, d);
        } else if (d <= 0 && typeof e.currentPosition === 'number' && e.currentPosition >= 0) {
            var elapsed = card.querySelector('.sc-track-card__elapsed');
            if (elapsed) elapsed.textContent = formatScTime(e.currentPosition);
        }
    });

    widget.bind(SC.Widget.Events.PAUSE, syncPlayIcons);
    widget.bind(SC.Widget.Events.PLAY, function () {
        syncPlayIcons();
        var c = playingCard;
        if (!c) return;
        var u = c.dataset.scUrl;
        widget.getCurrentSound(function (sound) {
            if (playingCard !== c || !sound) return;
            if (!scSoundMatchesCard(sound, u)) return;
            if (sound.duration) {
                c.dataset.scDuration = String(sound.duration);
                var tEl = c.querySelector('.sc-track-card__total');
                if (tEl) tEl.textContent = formatScTime(sound.duration);
            }
            widget.getPosition(function (pos) {
                if (playingCard !== c) return;
                var dur = sound.duration || parseInt(c.dataset.scDuration, 10) || 0;
                if (dur > 0) applyProgressUi(c, pos, dur);
            });
        });
    });
    widget.bind(SC.Widget.Events.FINISH, function () {
        seekHoldMs = null;
        if (playingCard) {
            playingCard.classList.remove('sc-track-card--playing');
            resetProgressUi(playingCard);
        }
        playingCard = null;
        syncPlayIcons();
    });

    function wireCard(card) {
        const playBtn = card.querySelector('.sc-track-card__play');
        const progressWrap = card.querySelector('.sc-track-card__progress-wrap');
        const url = card.dataset.scUrl;
        if (!playBtn || !url) return;

        var loadOpts = {
            hide_related: true,
            show_comments: false,
            sharing: false,
            show_user: false,
            show_reposts: false,
            show_teaser: false,
            visual: false,
            buying: false,
            download: false,
            color: '4488ff'
        };

        playBtn.addEventListener('click', function () {
            if (playingCard === card) {
                widget.toggle();
                return;
            }
            document.querySelectorAll('.sc-track-card').forEach(function (c) {
                if (c !== card) resetProgressUi(c);
            });
            seekHoldMs = null;
            playingCard = card;

            /* Buffered: iframe initial URL or hover prefetch */
            if (lastLoadedUrl === url) {
                widget.getCurrentSound(function (sound) {
                    var dur =
                        sound && sound.duration
                            ? sound.duration
                            : parseInt(card.dataset.scDuration, 10) || 0;
                    widget.getPosition(function (pos) {
                        if (dur > 0 && pos >= dur - 1000) widget.seekTo(0);
                        widget.play();
                        syncPlayIcons();
                        syncMetadataWhenReady(card, url);
                    });
                });
                return;
            }

            const nonce = ++readyNonce;
            const onReady = function () {
                widget.unbind(SC.Widget.Events.READY, onReady);
                if (nonce !== readyNonce || playingCard !== card) return;
                lastLoadedUrl = url;
                syncPlayIcons();
                syncMetadataWhenReady(card, url);
            };
            widget.bind(SC.Widget.Events.READY, onReady);
            widget.load(url, Object.assign({ auto_play: true }, loadOpts));
            /* Same URL as initial iframe may not re-fire READY — force play + metadata */
            setTimeout(function () {
                if (nonce !== readyNonce || playingCard !== card) return;
                widget.isPaused(function (paused) {
                    if (!paused) return;
                    widget.play();
                    lastLoadedUrl = url;
                    syncPlayIcons();
                    syncMetadataWhenReady(card, url);
                });
            }, 700);
        });

        var prefetchTimer = null;
        card.addEventListener('mouseenter', function () {
            if (!allowPrefetch() || playingCard !== null) return;
            var u = card.dataset.scUrl;
            if (!u || u === lastLoadedUrl) return;
            prefetchTimer = setTimeout(function () {
                prefetchTimer = null;
                if (playingCard !== null || u === lastLoadedUrl) return;
                var gen = ++prefetchGen;
                widget.load(u, Object.assign({ auto_play: false }, loadOpts));
                var onPrefetchReady = function () {
                    widget.unbind(SC.Widget.Events.READY, onPrefetchReady);
                    if (gen === prefetchGen) lastLoadedUrl = u;
                };
                widget.bind(SC.Widget.Events.READY, onPrefetchReady);
            }, 380);
        });
        card.addEventListener('mouseleave', function () {
            if (prefetchTimer) {
                clearTimeout(prefetchTimer);
                prefetchTimer = null;
            }
        });

        function seekFromClientX(clientX) {
            if (playingCard !== card) return;
            const track = card.querySelector('.sc-track-card__progress-track');
            if (!track) return;
            const rect = track.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
            const dur = parseInt(card.dataset.scDuration, 10);
            if (dur <= 0) return;
            var targetMs = pct * dur;
            seekHoldMs = targetMs;
            seekHoldStarted = Date.now();
            applyProgressUi(card, targetMs, dur);
            widget.seekTo(targetMs);
        }

        var scrubZone = card.querySelector('.sc-track-card__progress-scrub');
        var scrubHint = card.querySelector('.sc-track-card__scrub-hint');
        var progressTrack = card.querySelector('.sc-track-card__progress-track');
        if (scrubZone && scrubHint && progressTrack) {
            scrubZone.addEventListener('mousemove', function (ev) {
                var dur = getScTrackDurationMs(card);
                if (dur <= 0) return;
                var tr = progressTrack.getBoundingClientRect();
                var pct = Math.max(0, Math.min(1, (ev.clientX - tr.left) / tr.width));
                scrubHint.textContent = formatScTime(pct * dur);
                scrubHint.style.left = Math.max(6, Math.min(94, pct * 100)) + '%';
                scrubHint.classList.add('is-visible');
            });
            scrubZone.addEventListener('mouseleave', function () {
                scrubHint.classList.remove('is-visible');
            });
        }

        if (progressWrap) {
            progressWrap.addEventListener('click', function (ev) {
                seekFromClientX(ev.clientX);
            });
            progressWrap.addEventListener('keydown', function (ev) {
                if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
                ev.preventDefault();
                const dur = parseInt(card.dataset.scDuration, 10);
                if (dur <= 0 || playingCard !== card) return;
                widget.getPosition(function (pos) {
                    const delta = ev.key === 'ArrowRight' ? 5000 : -5000;
                    var targetMs = Math.max(0, Math.min(dur, pos + delta));
                    seekHoldMs = targetMs;
                    seekHoldStarted = Date.now();
                    applyProgressUi(card, targetMs, dur);
                    widget.seekTo(targetMs);
                });
            });
        }
    }

    cards.forEach(function (card, idx) {
        const trackUrl = card.dataset.scUrl;
        const openUrl = card.dataset.scOpen || '';
        fetch('https://soundcloud.com/oembed?format=json&url=' + encodeURIComponent(trackUrl))
            .then(function (r) {
                return r.ok ? r.json() : null;
            })
            .then(function (data) {
                var title = 'Track';
                var artist = 'SoundCloud';
                var thumb = '';
                if (data && data.title) {
                    var by = data.title.lastIndexOf(' by ');
                    if (by > 0) {
                        title = data.title.slice(0, by);
                        artist = data.title.slice(by + 4);
                    } else {
                        title = data.title;
                    }
                }
                if (data && data.thumbnail_url) {
                    thumb = data.thumbnail_url.replace('-large', '-t300x300');
                }
                buildScTrackCardMarkup(card, { title: title, artist: artist, thumb: thumb, openUrl: openUrl });
                card.classList.remove('sc-track-card--loading');
                wireCard(card);
                // Staggered entrance with anime.js
                anime({
                    targets: card,
                    opacity: [0, 1],
                    translateY: [12, 0],
                    duration: 450,
                    delay: idx * 80,
                    easing: 'easeOutCubic',
                    complete: function() { card.classList.add('sc-track-card--entered'); }
                });
            })
            .catch(function () {
                buildScTrackCardMarkup(card, { title: 'Track', artist: 'SoundCloud', thumb: '', openUrl: openUrl });
                card.classList.remove('sc-track-card--loading');
                wireCard(card);
                anime({
                    targets: card,
                    opacity: [0, 1],
                    translateY: [12, 0],
                    duration: 450,
                    delay: idx * 80,
                    easing: 'easeOutCubic',
                    complete: function() { card.classList.add('sc-track-card--entered'); }
                });
            });
    });
}

// ===== 13. HEADER AMBIENCE =====
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
        W = window.innerWidth;
        H = 260;
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

// ===== 14. DOMCONTENTLOADED INIT =====
// ===== CUSTOM VIDEO PLAYER =====
function initCustomVideoPlayers() {
    document.querySelectorAll('.cvp').forEach(container => {
        const video = container.querySelector('video');
        if (!video) return;

        const bigPlay = container.querySelector('.cvp-big-play');
        const viewport = container.querySelector('.cvp-viewport');
        const playBtn = container.querySelector('.cvp-btn--play');
        const speedBtn = container.querySelector('.cvp-btn--speed');
        const fsBtn = container.querySelector('.cvp-btn--fs');
        const progressBar = container.querySelector('.cvp-progress');
        const progressFill = container.querySelector('.cvp-progress__fill');
        const timeDisplay = container.querySelector('.cvp-time');

        const speeds = [1, 1.25, 1.5, 2, 0.5, 0.75];
        let speedIdx = 0;

        function fmtTime(s) {
            if (!isFinite(s)) return '0:00';
            const m = Math.floor(s / 60);
            const sec = Math.floor(s % 60);
            return m + ':' + String(sec).padStart(2, '0');
        }

        function updateTime() {
            timeDisplay.textContent = fmtTime(video.currentTime) + ' / ' + fmtTime(video.duration);
            progressFill.style.width = (video.duration ? (video.currentTime / video.duration) * 100 : 0) + '%';
        }

        function togglePlay() {
            if (video.paused) {
                video.play();
            } else {
                video.pause();
            }
        }

        video.addEventListener('play', () => container.classList.add('is-playing'));
        video.addEventListener('pause', () => container.classList.remove('is-playing'));
        video.addEventListener('ended', () => container.classList.remove('is-playing'));
        video.addEventListener('timeupdate', updateTime);
        video.addEventListener('loadedmetadata', updateTime);

        // Play/pause controls
        viewport.addEventListener('click', (e) => {
            if (e.target.closest('.cvp-big-play')) { togglePlay(); return; }
            togglePlay();
        });
        playBtn.addEventListener('click', togglePlay);

        // Progress scrubbing
        let scrubbing = false;
        function scrub(e) {
            const rect = progressBar.getBoundingClientRect();
            const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            if (video.duration) video.currentTime = pct * video.duration;
            updateTime();
        }
        progressBar.addEventListener('mousedown', (e) => { scrubbing = true; scrub(e); });
        document.addEventListener('mousemove', (e) => { if (scrubbing) scrub(e); });
        document.addEventListener('mouseup', () => { scrubbing = false; });

        // Touch scrubbing
        progressBar.addEventListener('touchstart', (e) => {
            scrubbing = true;
            scrub(e.touches[0]);
        }, { passive: true });
        document.addEventListener('touchmove', (e) => {
            if (scrubbing) scrub(e.touches[0]);
        }, { passive: true });
        document.addEventListener('touchend', () => { scrubbing = false; });

        // Speed toggle
        speedBtn.addEventListener('click', () => {
            speedIdx = (speedIdx + 1) % speeds.length;
            video.playbackRate = speeds[speedIdx];
            speedBtn.textContent = speeds[speedIdx] + 'x';
        });

        // Fullscreen
        fsBtn.addEventListener('click', () => {
            if (document.fullscreenElement === container) {
                document.exitFullscreen();
            } else if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if (container.webkitRequestFullscreen) {
                container.webkitRequestFullscreen();
            }
        });

        // Keyboard controls when focused
        container.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'k') { e.preventDefault(); togglePlay(); }
            else if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.duration, video.currentTime + 5); }
            else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(0, video.currentTime - 5); }
            else if (e.key === 'f') { fsBtn.click(); }
        });

        container.setAttribute('tabindex', '0');
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initBootSequence();
    initTabKeyboard();
    initRouting();
    initCursorTrail();
    initKonamiCode();
    initConsoleEasterEgg();
    initAudioVisualizer();
    initCarousels();
    initSoundCloudCardsOnFirstVisit();
    initEntryHoverAnimations();
    initCustomVideoPlayers();
    initHeaderAmbience();

    // Wire up tab buttons
    document.querySelectorAll('.tab[data-tab]').forEach(tab => {
        tab.addEventListener('click', () => showTab(tab.dataset.tab));
    });

    // Wire up NOW item deep-links
    document.querySelectorAll('.now-item[data-open-entry]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            openEntry(item.dataset.openTab, item.dataset.openEntry);
        });
    });

    // Wire up accordion entry headers
    document.querySelectorAll('.entry-header').forEach(header => {
        header.addEventListener('click', function() { toggleDropdown(this); });
        header.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDropdown(this); }
        });
    });

    // Make site title clickable to go home
    const siteTitle = document.querySelector('.site-title');
    if (siteTitle) {
        siteTitle.style.cursor = 'pointer';
        siteTitle.addEventListener('click', () => showTab('home'));
    }

    // Show initial content based on URL hash (or home by default)
    const initialTab = getInitialTab();
    showTab(initialTab, false);

    // Init scroll reveals after a short delay (after entrance animation)
    setTimeout(initScrollReveals, 1500);
});
