let currentTab = null;

// ===== UTILITY FUNCTIONS =====
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

// ===== BOOT SEQUENCE LOADING SCREEN =====
function initBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const bootLines = document.querySelectorAll('.boot-line');
    const progressBar = document.querySelector('.progress-bar');
    const bootHex = document.getElementById('boot-hex');
    const bootContainer = document.querySelector('.boot-container');

    if (!bootScreen) return;

    // Generate random hex stream (optimized - pre-generate characters)
    const hexChars = '0123456789ABCDEF';
    function generateHex() {
        let hex = '';
        for (let i = 0; i < 200; i++) {
            hex += hexChars[Math.floor(Math.random() * 16)];
            if (i % 4 === 3) hex += ' ';
        }
        return hex;
    }

    // Typewriter effect for boot lines
    function typewriterLine(line, text, speed = 15) {
        return new Promise((resolve) => {
            line.classList.add('visible');
            const originalHTML = line.innerHTML;
            line.innerHTML = '';
            line.style.opacity = '1';

            let i = 0;
            let inTag = false;
            let currentTag = '';

            function typeChar() {
                if (i < originalHTML.length) {
                    const char = originalHTML[i];

                    // Handle HTML tags
                    if (char === '<') {
                        inTag = true;
                        currentTag = '<';
                    } else if (char === '>') {
                        inTag = false;
                        currentTag += '>';
                        line.innerHTML += currentTag;
                        currentTag = '';
                        i++;
                        typeChar();
                        return;
                    } else if (inTag) {
                        currentTag += char;
                        i++;
                        typeChar();
                        return;
                    } else {
                        line.innerHTML += char;
                    }

                    i++;
                    // Vary typing speed for natural feel
                    const variance = Math.random() * 20 - 10;
                    setTimeout(typeChar, speed + variance);
                } else {
                    resolve();
                }
            }
            typeChar();
        });
    }

    // Screen glitch effect
    function screenGlitch(intensity = 1, duration = 100) {
        bootScreen.style.transform = `translate(${(Math.random() - 0.5) * 4 * intensity}px, ${(Math.random() - 0.5) * 4 * intensity}px)`;
        bootScreen.style.filter = `hue-rotate(${Math.random() * 30 * intensity}deg) brightness(${1 + Math.random() * 0.3 * intensity})`;

        setTimeout(() => {
            bootScreen.style.transform = '';
            bootScreen.style.filter = '';
        }, duration);
    }

    // Screen flash effect
    function screenFlash(color = '#00ff00', duration = 150) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            inset: 0;
            background: ${color};
            opacity: 0.3;
            z-index: 999999;
            pointer-events: none;
            animation: flashFade ${duration}ms ease-out forwards;
        `;

        // Add keyframes if not exists
        if (!document.getElementById('flash-keyframes')) {
            const style = document.createElement('style');
            style.id = 'flash-keyframes';
            style.textContent = `
                @keyframes flashFade {
                    0% { opacity: 0.4; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        bootScreen.appendChild(flash);
        setTimeout(() => flash.remove(), duration);
    }

    // CRT scan line effect
    function crtScan() {
        const scanLine = document.createElement('div');
        scanLine.style.cssText = `
            position: fixed;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(to bottom, transparent, rgba(0, 255, 0, 0.15), transparent);
            z-index: 999998;
            pointer-events: none;
            animation: scanDown 2s linear infinite;
        `;

        if (!document.getElementById('scan-keyframes')) {
            const style = document.createElement('style');
            style.id = 'scan-keyframes';
            style.textContent = `
                @keyframes scanDown {
                    0% { top: -4px; }
                    100% { top: 100%; }
                }
            `;
            document.head.appendChild(style);
        }

        bootScreen.appendChild(scanLine);
        return scanLine;
    }

    // Start CRT scan effect
    const scanLine = crtScan();

    // Update hex display with rAF instead of setInterval
    let hexAnimationId;
    let lastHexUpdate = 0;
    function updateHex(timestamp) {
        if (timestamp - lastHexUpdate > 50) {
            if (bootHex) bootHex.textContent = generateHex();
            lastHexUpdate = timestamp;
        }
        hexAnimationId = requestAnimationFrame(updateHex);
    }
    hexAnimationId = requestAnimationFrame(updateHex);

    // Progress bar - use CSS transitions for smooth GPU-accelerated animation
    const totalLines = bootLines.length;

    // Enable smooth CSS transition on the progress bar
    progressBar.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    function setProgressTarget(newTarget) {
        progressBar.style.width = newTarget + '%';
    }

    // Animate boot lines with typewriter effect and drama
    async function animateBootLines() {
        for (let i = 0; i < bootLines.length; i++) {
            const line = bootLines[i];
            const delay = parseInt(line.dataset.delay) || i * 200;

            await new Promise(resolve => setTimeout(resolve, delay - (i > 0 ? parseInt(bootLines[i-1].dataset.delay) || 0 : 0)));

            // Add glitch on reveal
            if (Math.random() > 0.5) {
                screenGlitch(0.3, 30);
            }

            // Typewriter effect for most lines
            if (line.textContent.length < 80) {
                await typewriterLine(line, line.innerHTML, 12);
            } else {
                line.classList.add('visible');
            }

            // Update progress target as each line completes (reserve last 15% for final line)
            const lineProgress = ((i + 1) / totalLines) * 85;
            setProgressTarget(lineProgress);

            // Special effects for key lines
            if (line.textContent.includes('VIRTUAL HANDSHAKE')) {
                // Big dramatic moment - glitches only, no flashes
                screenGlitch(1.5, 80);
                await new Promise(r => setTimeout(r, 100));
                screenGlitch(1, 60);
                // Final push to 100%
                setProgressTarget(100);
            }
        }
    }

    // Wait for boot animations to complete, then trigger exit
    animateBootLines().then(() => {
        // Give a moment to appreciate the final line
        setTimeout(() => {
            cancelAnimationFrame(hexAnimationId);

            // Final dramatic sequence - glitch only, then white flash on exit
            screenGlitch(2, 100);

            setTimeout(() => {
                screenFlash('#ffffff', 150);
                bootScreen.style.transition = 'opacity 0.6s ease, transform 0.6s ease, filter 0.6s ease';
                bootScreen.style.opacity = '0';
                bootScreen.style.transform = 'scale(1.02)';
                bootScreen.style.filter = 'brightness(2) blur(2px)';

                // Remove from DOM after transition
                setTimeout(() => {
                    if (scanLine) scanLine.remove();
                    bootScreen.remove();
                }, 600);
            }, 150);
        }, 800); // 800ms pause after "VIRTUAL HANDSHAKE COMPLETE"
    });
}

// ===== KONAMI CODE SECRET MODE =====
function initKonamiCode() {
    const konamiCode = [
        'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
        'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
        'KeyB', 'KeyA'
    ];
    let konamiIndex = 0;
    let secretModeActive = false;

    document.addEventListener('keydown', (e) => {
        if (e.code === konamiCode[konamiIndex]) {
            konamiIndex++;
            
            if (konamiIndex === konamiCode.length) {
                activateSecretMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });

    function activateSecretMode() {
        secretModeActive = !secretModeActive;
        
        if (secretModeActive) {
            document.body.classList.add('secret-mode');
            showSecretNotification();
            triggerCRTFlicker();
        } else {
            document.body.classList.remove('secret-mode');
        }
    }

    function showSecretNotification() {
        const notification = document.createElement('div');
        notification.className = 'secret-mode-notification';
        notification.innerHTML = `
            <h2>// SECRET MODE ACTIVATED //</h2>
            <p>Welcome to the other side, hacker.</p>
            <p style="margin-top: 10px; font-size: 0.75em; color: #ff00ff;">Press Konami code again to deactivate</p>
        `;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'secretReveal 0.3s ease reverse forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    function triggerCRTFlicker() {
        document.body.classList.add('crt-flicker');
        setTimeout(() => document.body.classList.remove('crt-flicker'), 100);
    }
}

// ===== PREMIUM CARD EFFECTS (shine & glow) =====
// Use event delegation - attach once to document, handles all entries
let cardEffectsInitialized = false;

function init3DTilt() {
    if (cardEffectsInitialized) return; // Only initialize once
    cardEffectsInitialized = true;

    // Event delegation - single listener for all entries
    document.addEventListener('mousemove', (e) => {
        const entry = e.target.closest('.entry:not(#music .entry)');
        if (!entry) return;

        const rect = entry.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const mouseXPercent = (x / rect.width) * 100;
        const mouseYPercent = (y / rect.height) * 100;
        const shineX = ((x / rect.width) * 200) - 100;

        entry.style.setProperty('--mouseX', `${mouseXPercent}%`);
        entry.style.setProperty('--mouseY', `${mouseYPercent}%`);
        entry.style.setProperty('--shineX', `${shineX}%`);
    });

    document.addEventListener('mouseleave', (e) => {
        const entry = e.target.closest('.entry:not(#music .entry)');
        if (!entry) return;
        entry.style.setProperty('--shineX', '-100%');
    }, true);
}


function initCyberpunkGallery() {
    const container = document.querySelector('.cyberpunk-gallery-container');
    const images = document.querySelectorAll('.cyberpunk-image');
    const loader = container ? container.querySelector('.gallery-loader') : null;
    const shell = container ? container.closest('.gallery-shell') : null;
    const titleEl = shell ? shell.querySelector('#galleryTitle') : null;
    const locationEl = shell ? shell.querySelector('#galleryLocation') : null;
    const dateEl = shell ? shell.querySelector('#galleryDate') : null;
    let currentIndex = 0;

    // Create matrix rain canvas
    const matrixRain = document.createElement('canvas');
    matrixRain.className = 'matrix-rain';
    container.appendChild(matrixRain);
    const ctx = matrixRain.getContext('2d');
    matrixRain.style.opacity = '0';

    // Set up matrix rain
    let fontSize = 14;
    let columns = 0;
    let drops = [];

    // Use fixed container dimensions - no more jarring resizes between images
    function initFixedContainer() {
        if (!container) return;
        // Fixed aspect ratio (4:5 works well for portraits and landscapes)
        const maxWidth = Math.min(500, window.innerWidth * 0.85);
        container.style.width = `${maxWidth}px`;
        container.style.aspectRatio = '4 / 5';
        if (shell) {
            shell.style.width = `${maxWidth}px`;
        }
    }

    // No-op function to maintain compatibility with existing calls
    function setContainerRatio(image) {
        // Container size is now fixed - images use object-fit: contain
    }

    function initializeRain() {
        matrixRain.width = container.clientWidth;
        matrixRain.height = container.clientHeight;
        columns = matrixRain.width / fontSize;
        drops = [];
        for (let i = 0; i < columns; i++) {
            drops[i] = 1;
        }
    }

    function drawMatrixRain() {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'; // Increased opacity for faster fade
        ctx.fillRect(0, 0, matrixRain.width, matrixRain.height);
        ctx.fillStyle = '#0f0';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = String.fromCharCode(Math.random() * 128);
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > matrixRain.height && Math.random() > 0.95) { // Increased probability of resetting
                drops[i] = 0;
            }
            drops[i] += 2; // Increased speed
        }
    }

    function setHudFading(isFading) {
        [titleEl, locationEl, dateEl].forEach((el) => {
            if (!el) return;
            el.classList.toggle('is-fading', isFading);
        });
    }

    function setLoaderVisible(isVisible) {
        if (!loader) return;
        loader.classList.toggle('is-visible', isVisible);
    }

    function waitForImage(image) {
        if (!image) return Promise.resolve();
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();
        return new Promise((resolve) => {
            const onLoad = () => resolve();
            const onError = () => resolve();
            image.addEventListener('load', onLoad, { once: true });
            image.addEventListener('error', onError, { once: true });
        });
    }

    function preloadImages() {
        images.forEach((image) => {
            if (image.complete) return;
            const preloader = new Image();
            preloader.src = image.src;
        });
    }

    function setHudText(image) {
        if (!image) return;
        const title = image.dataset.title || image.alt || '';
        const location = image.dataset.location || 'Unknown';
        const date = image.dataset.date || '----';
        if (titleEl) titleEl.textContent = title;
        if (locationEl) locationEl.textContent = location;
        if (dateEl) dateEl.textContent = date;
        setContainerRatio(image);
    }

    async function transitionImages() {
        setHudFading(true);
        if (container) {
            container.classList.add('is-transitioning');
        }
        images[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;
        const nextImage = images[currentIndex];

        if (nextImage && (!nextImage.complete || nextImage.naturalWidth === 0)) {
            setLoaderVisible(true);
            await waitForImage(nextImage);
        }

        // Start matrix rain animation
        matrixRain.style.opacity = '1';
        let frames = 0;
        const maxFrames = 60; // Adjust this value to control the duration of the animation
        
        return new Promise((resolve) => {
            const rainAnimation = setInterval(() => {
                drawMatrixRain();
                frames++;
                if (frames >= maxFrames) {
                    clearInterval(rainAnimation);
                    matrixRain.style.opacity = '0';
                    images[currentIndex].classList.add('active');
                    setHudText(images[currentIndex]);
                    setHudFading(false);
                    setLoaderVisible(false);
                    if (container) {
                        setTimeout(() => {
                            container.classList.remove('is-transitioning');
                        }, 350);
                    }
                    resolve();
                }
            }, 16); // Run at approximately 60 FPS
        });
    }

    // Resize canvas when window is resized
    function resizeCanvas() {
        initFixedContainer();
        initializeRain();
    }

    window.addEventListener('resize', debounce(resizeCanvas, 150));
    initFixedContainer(); // Set fixed container size
    initializeRain(); // Initialize on load
    setLoaderVisible(true);
    waitForImage(images[currentIndex]).then(() => {
        setHudText(images[currentIndex]);
        setHudFading(false);
        setLoaderVisible(false);
    });
    preloadImages();

    // Start the image transition loop
    async function transitionLoop() {
        while (true) {
            await transitionImages();
            await new Promise(resolve => setTimeout(resolve, 8000)); // Wait 8 seconds between transitions
        }
    }

    transitionLoop();
}


function showTab(tabName) {
    const blurb = document.getElementById('blurb');
    const moreAboutMe = document.getElementById('more-about-me');
    const blurbContent = {
        // work: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        // projects: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        work: '',
        projects: '',
        music: '<p class="music-description">From a young age, I was immersed in a rich tapestry of sounds, with my parents often playing The Beatles\' album "1." This early exposure sparked a deep-seated love for music, driving me to learn the guitar and eventually delve into the world of electronic music production. To me, music is more than just melodies and rhythms; it is a profound language that transcends boundaries and speaks to the soul. Through EDM, I find a unique avenue to express my innermost emotions and thoughts, creating connections that I hope resonate deeply with listeners. I am making it my mission to combine the technology of computer science with music to further advance the field and push the boundaries of what is possible.</p>'
    };

    if (moreAboutMe) {
        moreAboutMe.style.opacity = '0';
        setTimeout(() => {
            moreAboutMe.style.display = 'none';
        }, 500);
    }

    blurb.classList.add('fade-out');
    setTimeout(() => {
        blurb.innerHTML = blurbContent[tabName];
        blurb.classList.remove('fade-out');
        blurb.classList.add('fade-in');
        setTimeout(() => {
            blurb.classList.remove('fade-in');
        }, 250);
    }, 250);

    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    currentTab = tabName;

    
    setTimeout(() => {
        document.querySelectorAll('.content').forEach(content => {
            content.classList.remove('active');
        });
        const selectedContent = document.getElementById(tabName);
        selectedContent.classList.add('active');
        const entries = selectedContent.querySelectorAll('.entry');
        entries.forEach((entry, index) => {
            entry.classList.remove('fade-in');
            void entry.offsetWidth; // Trigger reflow
            setTimeout(() => {
                entry.classList.add('fade-in');
            }, index * 100);
        });
        
        // Note: 3D tilt uses event delegation, no re-init needed

        // Notify visualizer after tab is actually active
        document.dispatchEvent(new CustomEvent('visualizer-tab-change', { detail: tabName }));

    }, 250);

}

function toggleDropdown(element) {
    const dropdown = element.querySelector('.dropdown');
    const isOpen = dropdown.style.display === 'block';
    
    if (isOpen) {
        gsap.to(dropdown, { height: 0, opacity: 0, duration: 0.5, onComplete: () => {
            dropdown.style.display = 'none';
        }});
    } else {
        dropdown.style.display = 'block';
        dropdown.style.height = 'auto';
        const height = dropdown.clientHeight + 'px';
        dropdown.style.height = 0;
        gsap.to(dropdown, { height: height, opacity: 1, duration: 0.5, onComplete: () => {
            dropdown.style.height = 'auto';
        }});
    }
    synchronizeBlinking();
}

function synchronizeBlinking() {
    const blinkers = document.querySelectorAll('.blinking-cursor');
    blinkers.forEach(blinker => {
        blinker.style.animation = 'none';
        setTimeout(() => {
            blinker.style.animation = '';
        }, 0);
    });
}

// Prevents dropdown from closing when clicking videos/links inside
function preventDropdown(event) {
    event.stopPropagation();
}

// Alias for consistency
function preventClose(event) {
    event.stopPropagation();
}

function createBlinkingLights() {
    const body = document.body;
    const lightCount = 60;
    const lights = [];
    let animationId = null;

    // Create all light elements once
    for (let i = 0; i < lightCount; i++) {
        const light = document.createElement('div');
        light.className = 'blink';
        light.style.cssText = `
            position: absolute;
            left: ${5 + Math.random() * 90}%;
            top: ${5 + Math.random() * 90}%;
            width: ${1.5 + Math.random() * 1.5}px;
            height: ${1.5 + Math.random() * 1.5}px;
            background-color: #00ff00;
            border-radius: 50%;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease, box-shadow 0.3s ease;
        `;
        body.appendChild(light);

        // Store light with its animation state
        lights.push({
            element: light,
            phase: Math.random() * Math.PI * 2,  // Random starting phase
            speed: 0.3 + Math.random() * 0.7,    // Varied animation speeds
            brightness: 0.5 + Math.random() * 0.5, // Varied max brightness
            pulseMode: Math.random() > 0.7,      // 30% pulse smoothly, 70% blink
            nextToggle: performance.now() + Math.random() * 3000, // For blink mode
            isOn: false
        });
    }

    let lastTime = performance.now();

    // Single rAF loop for all lights
    function animateLights(currentTime) {
        const deltaTime = (currentTime - lastTime) / 1000;
        lastTime = currentTime;

        const isSecretMode = document.body.classList.contains('secret-mode');
        const baseColor = isSecretMode ? '255, 0, 255' : '0, 255, 0';

        for (let i = 0; i < lights.length; i++) {
            const light = lights[i];

            if (light.pulseMode) {
                // Smooth pulsing lights (sine wave)
                light.phase += deltaTime * light.speed * 2;
                const pulse = (Math.sin(light.phase) + 1) / 2;
                const opacity = pulse * light.brightness;
                light.element.style.opacity = opacity.toFixed(3);

                // Add glow on bright pulses
                if (opacity > 0.6) {
                    light.element.style.boxShadow = `0 0 ${4 + opacity * 4}px rgba(${baseColor}, ${opacity})`;
                } else {
                    light.element.style.boxShadow = 'none';
                }
            } else {
                // Blinking lights (random toggle)
                if (currentTime > light.nextToggle) {
                    light.isOn = !light.isOn;
                    light.element.style.opacity = light.isOn ? light.brightness.toFixed(3) : '0';
                    light.element.style.boxShadow = light.isOn
                        ? `0 0 6px rgba(${baseColor}, 0.8)`
                        : 'none';
                    // Random interval between 500-3500ms
                    light.nextToggle = currentTime + 500 + Math.random() * 3000;
                }
            }
        }

        animationId = requestAnimationFrame(animateLights);
    }

    // Start animation
    animationId = requestAnimationFrame(animateLights);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    });

    // Pause when tab is hidden (rAF does this automatically, but for cleanup)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        } else if (!document.hidden && !animationId) {
            lastTime = performance.now();
            animationId = requestAnimationFrame(animateLights);
        }
    });
}


function initCarousel(carouselContainer) {
    let slideIndex = 1;

    function plusSlides(n) {
        showSlides(slideIndex += n);
    }

    function showSlides(n) {
        const slides = carouselContainer.querySelectorAll(".carousel-slide img");
        if (n > slides.length) { 
            slideIndex = 1;
        }
        if (n < 1) { 
            slideIndex = slides.length;
        }
        for (let i = 0; i < slides.length; i++) {
            slides[i].classList.remove('fade-in', 'fade-out');
            slides[i].style.display = "none";
        }
        slides[slideIndex - 1].style.display = "block";
        slides[slideIndex - 1].classList.add('fade-in');
    }

    showSlides(slideIndex);

    carouselContainer.querySelector('.prev').addEventListener('click', function(event) {
        event.stopPropagation();
        plusSlides(-1);
    });

    carouselContainer.querySelector('.next').addEventListener('click', function(event) {
        event.stopPropagation();
        plusSlides(1);
    });
}


function createCursor() {
    if (isMobileOrTablet()) {
        return; // Don't create cursor effect for mobile or tablet devices
    }
    
    // Create container for falling characters
    const cursorContainer = document.createElement('div');
    cursorContainer.className = 'cursor-rain-container';
    document.body.appendChild(cursorContainer);

    const chars = '01アイウエオカキクケコサシスセソタチツテト10';
    const particles = [];
    const maxParticles = 25;
    let mouseX = 0;
    let mouseY = 0;
    let lastX = 0;
    let lastY = 0;
    let isOverInteractive = false;

    function createParticle(x, y) {
        if (particles.length >= maxParticles) {
            const oldParticle = particles.shift();
            if (oldParticle.element.parentNode) {
                oldParticle.element.remove();
            }
        }

        const particle = document.createElement('span');
        particle.className = 'cursor-rain-char';
        particle.textContent = chars[Math.floor(Math.random() * chars.length)];
        particle.style.left = `${x + (Math.random() - 0.5) * 20}px`;
        particle.style.top = `${y}px`;
        
        // Vary the animation slightly
        const duration = 0.8 + Math.random() * 0.4;
        const drift = (Math.random() - 0.5) * 30;
        particle.style.setProperty('--fall-duration', `${duration}s`);
        particle.style.setProperty('--drift', `${drift}px`);
        
        if (isOverInteractive) {
            particle.classList.add('interactive');
        }
        
        cursorContainer.appendChild(particle);
        particles.push({ element: particle, created: Date.now() });

        // Remove after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
            const index = particles.findIndex(p => p.element === particle);
            if (index > -1) particles.splice(index, 1);
        }, duration * 1000);
    }

    let frameCount = 0;
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        
        // Calculate movement distance
        const distance = Math.sqrt((mouseX - lastX) ** 2 + (mouseY - lastY) ** 2);
        
        frameCount++;
        // Spawn particles based on movement (more movement = more particles)
        if (frameCount % 2 === 0 && distance > 5) {
            createParticle(mouseX, mouseY);
        }
        
        lastX = mouseX;
        lastY = mouseY;
    });

    // Track interactive elements
    const interactiveElements = 'a, button, .entry, video, .plyr__controls *, .plyr__progress *, .plyr__menu *, .soundcloud-block';

    document.querySelectorAll(interactiveElements).forEach((el) => {
        el.addEventListener('mouseenter', () => {
            isOverInteractive = true;
        });
        el.addEventListener('mouseleave', () => {
            isOverInteractive = false;
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize boot sequence first
    initBootSequence();
    
    // Initialize new features
    initKonamiCode();
    init3DTilt();
    initAudioVisualizer();
    
    // Original initializations
    createCursor();
    createBlinkingLights();
    initCyberpunkGallery();

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('mouseenter', function(e) {
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "rgba(0, 255, 0, 0.2)",
                ease: "power2.out",
                borderRadius: "10px"
            });
        });

        tab.addEventListener('mouseleave', function(e) {
            if (!tab.classList.contains('active')) {
                gsap.to(tab, {
                    duration: 0.5,
                    backgroundColor: "transparent",
                    ease: "power2.out",
                    borderRadius: "0px"
                });
            }
        });

        tab.addEventListener('click', function(e) {
            document.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
                gsap.to(t, {
                    duration: 0.5,
                    backgroundColor: "transparent",
                    ease: "power2.out",
                    borderRadius: "0px"
                });
            });
            tab.classList.add('active');
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "rgba(0, 255, 0, 0.2)",
                ease: "power2.out",
                borderRadius: "10px"
            });
        });
    });

    

    document.querySelectorAll('.carousel-container').forEach(initCarousel);
});

function isMobileOrTablet() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Easter Egg 1: Reactive Glitch Header (visual only)
function initReactiveGlitchHeader() {
    const glitchHeader = document.querySelector('.glitch');
    if (!glitchHeader) return;
    
    let isHovering = false;
    let glitchInterval = null;
    let coolDownTimeout = null;

    glitchHeader.addEventListener('mouseenter', () => {
        isHovering = true;
        if (coolDownTimeout) {
            clearTimeout(coolDownTimeout);
            coolDownTimeout = null;
        }
        intensifyGlitch();
    });
    
    glitchHeader.addEventListener('mouseleave', () => {
        isHovering = false;
        resetGlitch();
    });
    
    function intensifyGlitch() {
        glitchHeader.textContent = glitchHeader.getAttribute('data-text') || 'Ezequiel Cutin v33.3';
        glitchHeader.classList.add('intense-glitch');
        
        const originalText = glitchHeader.textContent;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        
        if (glitchInterval) clearInterval(glitchInterval);

        glitchInterval = setInterval(() => {
            if (!isHovering) {
                clearInterval(glitchInterval);
                glitchInterval = null;
                return;
            };
            
            let newText = originalText;
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * originalText.length);
                const randomChar = chars[Math.floor(Math.random() * chars.length)];
                newText = newText.substring(0, randomIndex) + randomChar + newText.substring(randomIndex + 1);
            }
            glitchHeader.textContent = newText;
            
            setTimeout(() => {
                if (isHovering) {
                    glitchHeader.textContent = originalText;
                }
            }, 100);
        }, 200);
    }
    
    function resetGlitch() {
        glitchHeader.classList.remove('intense-glitch');
        if (glitchInterval) {
            clearInterval(glitchInterval);
            glitchInterval = null;
        }
        const originalText = glitchHeader.getAttribute('data-text') || 'Ezequiel Cutin v33.3';
        const replaceAt = (str, index, replacement) => {
            return str.substring(0, index) + replacement + str.substring(index + 1);
        };
        coolDownTimeout = setTimeout(() => {
            if (!isHovering) {
                glitchHeader.textContent = replaceAt(originalText, Math.floor(Math.random() * originalText.length), '_');
            }
        }, 50);
        setTimeout(() => {
            glitchHeader.textContent = originalText;
        }, 150);
        setTimeout(() => {
            if (!isHovering) {
                glitchHeader.textContent = replaceAt(originalText, Math.floor(Math.random() * originalText.length), '█');
            }
        }, 250);
        setTimeout(() => {
            glitchHeader.textContent = originalText;
        }, 350);
    }
}

// Easter Egg 2: Developer Console Greeting
function initConsoleEasterEgg() {
    // ASCII Art for the console
    const asciiArt = `
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║                    ╔══════════════════════════════════════╗  ║
    ║                    ║  Ezequiel Cutin v33.3                ║  ║
    ║                    ║  Software Engineer | Data Analyst    ║  ║
    ║                    ║  Sales Engineer | Music Producer     ║  ║
    ║                    ╚══════════════════════════════════════╝  ║
    ║                                                              ║
    ║  Greetings, fellow dev. You've accessed the mainframe.       ║
    ║  Type 'help()' for console commands.                         ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
    `;
    
    // Console greeting
    console.log('%c' + asciiArt, 'color: #00ff00; font-family: monospace; font-size: 8px;');
    console.log('%cWelcome to the secret terminal! Type help() for commands.', 'color: #00ff00; font-size: 14px; font-weight: bold;');
    
    // Define interactive functions
    window.help = function() {
        console.log('%cAvailable commands:', 'color: #00ffff; font-weight: bold;');
        console.log('%c  contact() - Get contact information', 'color: #00ff00;');
        console.log('%c  projects() - View project links', 'color: #00ff00;');
        console.log('%c  skills() - Show technical skills', 'color: #00ff00;');
        console.log('%c  secret() - Reveal a secret message', 'color: #00ff00;');
        console.log('%c  about() - Learn more about Ezequiel', 'color: #00ff00;');
    };
    
    window.contact = function() {
        console.log('%c📧 Contact Information:', 'color: #00ffff; font-weight: bold;');
        console.log('%c  Email: ezequielcutin@gmail.com', 'color: #00ff00;');
        console.log('%c  LinkedIn: linkedin.com/in/ezequiel-cutin', 'color: #00ff00;');
        console.log('%c  GitHub: github.com/ezequielcutin', 'color: #00ff00;');
        console.log('%c  Twitter: @ezecutin', 'color: #00ff00;');
    };
    
    window.projects = function() {
        console.log('%c🚀 Featured Projects:', 'color: #00ffff; font-weight: bold;');
        console.log('%c  • Job Application Tracker: job-application-tracker-nu.vercel.app', 'color: #00ff00;');
        console.log('%c  • GoBank: github.com/ezequielcutin/gobank', 'color: #00ff00;');
        console.log('%c  • Spotify Track Downloader: github.com/ezequielcutin/spotify-to-mp3', 'color: #00ff00;');
        console.log('%c  • Fractal Mountain: ezequielcutin.github.io/fractal-mountain', 'color: #00ff00;');
        console.log('%c  • Architecture Style Detection: github.com/ezequielcutin/architecture-style-detection', 'color: #00ff00;');
    };
    
    window.skills = function() {
        console.log('%c💻 Technical Skills:', 'color: #00ffff; font-weight: bold;');
        console.log('%c  Languages: JavaScript, Python, C#, Java, Go, SQL', 'color: #00ff00;');
        console.log('%c  Frontend: React, TypeScript, HTML/CSS, WebGL', 'color: #00ff00;');
        console.log('%c  Backend: Node.js, Express, Flask, .NET Core', 'color: #00ff00;');
        console.log('%c  Databases: PostgreSQL, MongoDB, SQLite', 'color: #00ff00;');
        console.log('%c  Tools: Git, Docker, AWS, Heroku, Vercel', 'color: #00ff00;');
        console.log('%c  AI/ML: PyTorch, TensorFlow, Computer Vision', 'color: #00ff00;');
    };
    
    window.secret = function() {
        console.log('%c🤫 Secret Message:', 'color: #ff00ff; font-weight: bold;');
        console.log('%c  "The best code is the code that makes you smile."', 'color: #ff00ff;');
        console.log('%c  - Ezequiel Cutin', 'color: #ff00ff;');
        console.log('%c  P.S. You found the easter egg! 🎉', 'color: #ff00ff;');
    };
    
    window.about = function() {
        console.log('%c👨‍💻 About Ezequiel:', 'color: #00ffff; font-weight: bold;');
        console.log('%c  First-generation American with Argentinian roots', 'color: #00ff00;');
        console.log('%c  University of Michigan CS Graduate', 'color: #00ff00;');
        console.log('%c  Passionate about fútbol, hiking, and electronic music', 'color: #00ff00;');
        console.log('%c  Currently working at United Wholesale Mortgage', 'color: #00ff00;');
        console.log('%c  Building the future, one line of code at a time!', 'color: #00ff00;');
    };
    
    // Auto-run help if console is opened
    setTimeout(() => {
        if (window.help) {
            console.log('%c💡 Tip: Type help() to see available commands', 'color: #ffff00; font-style: italic;');
        }
    }, 1000);
}

// ===== AUDIO VISUALIZER =====
let audioVisualizerInitialized = false; // Guard to prevent multiple initializations

function initAudioVisualizer() {
    // Prevent multiple initializations
    if (audioVisualizerInitialized) {
        return;
    }
    
    const canvas = document.getElementById('audio-visualizer');
    const toggle = document.getElementById('visualizer-toggle');
    
    if (!canvas || !toggle) {
        return;
    }
    
    // Mark as initialized
    audioVisualizerInitialized = true;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationFrame = null;
    let isActive = false;
    let currentMode = 0; // 0: bars, 1: waveform, 2: circular, 3: ambient
    let pendingMode = null; // Target mode while waiting for mic (keeps ambient running)
    let isStartingVisualizer = false; // Guard to prevent concurrent startVisualizer calls
    
    const modes = ['bars', 'waveform', 'circular', 'ambient'];
    let timeData = new Uint8Array(0);
    let freqData = new Float32Array(0);

    const controls = document.getElementById('visualizer-controls');
    const modeToggle = document.getElementById('visualizer-mode-toggle');
    const exitToggle = document.getElementById('visualizer-exit');

    function isMusicTabActive() {
        const musicSection = document.getElementById('music');
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
            // Going TO ambient mode - clean up mic resources if they exist
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
            // Going FROM ambient TO mic-based mode
            // DON'T change currentMode yet - keep ambient running while we wait for mic
            // Store the target mode and apply it after mic is acquired
            if (isStartingVisualizer) return; // Prevent concurrent calls
            pendingMode = nextMode;
            // Update label to show what we're switching to
            const textSpan = toggle.querySelector('.visualizer-toggle-text');
            if (textSpan) {
                textSpan.textContent = modes[nextMode].toUpperCase();
            }
            startVisualizer();
            return;
        }

        // Switching between mic-based modes (analyser already exists)
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
                primary: '#ff00ff',
                secondary: '#ffff00',
                glow: '#ff00ff',
                shadow: 'rgba(255, 0, 255, 0.8)'
            };
        }
        return {
            primary: '#00ff88',
            secondary: '#00ffb4',
            glow: '#00ff88',
            shadow: 'rgba(0, 255, 136, 0.8)'
        };
    }
    
    // Set canvas size
    function resizeCanvas() {
        // Ensure minimum dimensions to prevent 0-size canvas errors
        const width = Math.max(window.innerWidth || 1, 1);
        const height = Math.max(window.innerHeight || 1, 1);
        canvas.width = width;
        canvas.height = height;
    }
    
    // Initialize canvas dimensions - use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
        resizeCanvas();
        // Verify dimensions were set correctly
        if (canvas.width === 0 || canvas.height === 0) {
            setTimeout(() => resizeCanvas(), 100);
        }
    });
    window.addEventListener('resize', debounce(resizeCanvas, 100));

    // Request microphone access and initialize audio
    async function startVisualizer() {
        // Prevent concurrent calls
        if (isStartingVisualizer) return;
        isStartingVisualizer = true;
        
        try {
            // Request microphone permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                } 
            });
            
            // Cancel any lingering animation frame (e.g., ambient still running)
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
                animationFrame = null;
            }
            
            // Apply pending mode now that mic is ready
            if (pendingMode !== null) {
                currentMode = pendingMode;
                pendingMode = null;
            }
            
            // Create audio context
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            // Increase sensitivity to pick up quieter sounds
            analyser.minDecibels = -90;
            analyser.maxDecibels = -10;
            
            microphone = audioContext.createMediaStreamSource(stream);
            microphone.connect(analyser);

            // Create analysis buffers aligned to analyser settings
            timeData = new Uint8Array(analyser.fftSize);
            freqData = new Float32Array(analyser.frequencyBinCount);
            
            isActive = true;
            canvas.classList.add('active');
            toggle.classList.add('active');
            
            // Show current mode on button
            applyModeLabel();
            updateVisualizerUI();
            
            resizeCanvas(); // Ensure canvas is sized before drawing
            // Double-check dimensions after resize
            if (canvas.width === 0 || canvas.height === 0) {
                isStartingVisualizer = false;
                return;
            }
            
            drawVisualizer();
        } catch (error) {
            console.error('Error accessing microphone:', error);
            // Mic failed - clear pending mode and stay in/return to ambient
            pendingMode = null;
            // Don't cancel animation frame - ambient might still be running and that's fine
            // Just make sure we're in ambient mode
            currentMode = 3;
            isActive = true;
            canvas.classList.add('active');
            toggle.classList.add('active');
            
            // Show mode on button
            applyModeLabel();
            updateVisualizerUI();
            
            resizeCanvas(); // Ensure canvas is sized before drawing
            // Only restart ambient if it's not already running
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
        
        // Reset button text
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
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateVisualizerUI();
    }
    
    // Draw frequency bars - FULL WIDTH SPECTRUM ANALYZER (ENGINEERED)
    function drawBars() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                return;
            }
        }
        analyser.getFloatFrequencyData(freqData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        const minDb = analyser.minDecibels;
        const maxDb = analyser.maxDecibels;
        
        // Clear with fade for trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const barCount = 96; // Full width bars
        const barWidth = canvas.width / barCount;
        const barSpacing = 1;
        const freqBins = freqData.length;
        if (freqBins === 0) {
            return;
        }
        
        // Process frequency data with logarithmic scaling across FULL width
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
            
            // Gentle compression and frequency tilt to lift highs
            norm = Math.pow(norm, 0.7);
            if (norm < 0.03) norm = 0; // Noise gate
            const tilt = 0.8 + Math.pow(normalizedPos, 0.5) * 2.0;
            const value = Math.min(1, norm * tilt);
            
            processedData.push(value);
            energySum += value;
        }
        
        // Normalize overall energy to reduce "left-heavy" bias
        const avgEnergy = energySum / barCount;
        const gain = avgEnergy > 0 ? Math.min(2.5, 0.6 / avgEnergy) : 1;
        
        // Smooth the data (moving average) for cleaner visualization
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
        
        // Calculate average for reactive effects
        const avgValue = smoothedData.reduce((a, b) => a + b, 0) / barCount;
        
        // Draw bars across full width
        for (let i = 0; i < barCount; i++) {
            const intensity = smoothedData[i];
            const normalizedPos = i / (barCount - 1);
            
            // Dynamic minimum height based on position (taller in center)
            const centerDistance = Math.abs(normalizedPos - 0.5) * 2;
            const minHeight = 4 + (1 - centerDistance) * 12;
        const maxHeight = canvas.height - 4;
        const barHeight = Math.min(maxHeight, minHeight + intensity * (canvas.height * 0.8));
            
            // Color gradient across spectrum: green -> cyan -> blue
            const hueProgress = normalizedPos;
            const r = Math.floor(primaryRgb.r * (1 - hueProgress * 0.3));
            const g = primaryRgb.g;
            const b = Math.floor(primaryRgb.b + hueProgress * 80);
            
            const x = i * barWidth;
            const y = Math.max(0, canvas.height - barHeight);
            
            // Create vertical gradient for each bar
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
            
            // Glow only on high-intensity bars (performance optimization)
            if (intensity > 0.5) {
                ctx.shadowBlur = 8 + intensity * 12;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${intensity * 0.7})`;
            } else {
                ctx.shadowBlur = 0;
            }
            
            ctx.fillRect(x + barSpacing, y, barWidth - barSpacing * 2, barHeight);
        }
        
        // Draw subtle reflection
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
        } : { r: 0, g: 255, b: 136 };
    }
    
    // Draw waveform - OPTIMIZED MULTI-LAYERED VERSION
    function drawWaveform() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                return;
            }
        }
        analyser.getByteTimeDomainData(timeData);
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerY = canvas.height / 2;
        
        // Calculate average amplitude for reactive effects
        let totalAmplitude = 0;
        for (let i = 0; i < timeData.length; i++) {
            totalAmplitude += Math.abs(timeData[i] - 128);
        }
        const avgAmplitude = totalAmplitude / timeData.length;
        const amplitudeNormalized = avgAmplitude / 128;
        
        // Draw main waveform (only 2 layers for performance)
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
            
            // Only use shadow on main layer when there's significant audio
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
        
        // Draw subtle center line
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 0;
        ctx.moveTo(0, centerY);
        ctx.lineTo(canvas.width, centerY);
        ctx.stroke();
    }
    
    // Draw circular visualization - OPTIMIZED SYMMETRIC VERSION
    let circularRotation = 0;
    function drawCircular() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                return;
            }
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
        
        // Process frequency data with logarithmic scaling
        const numBars = 48; // Reduced for performance
        const freqBins = freqData.length;
        if (freqBins === 0) {
            return;
        }
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
            
            // Compression and tilt for higher frequencies
            norm = Math.pow(norm, 0.7);
            if (norm < 0.04) norm = 0;
            const tilt = 0.9 + Math.pow(normalizedPos, 0.6) * 1.8;
            processedData.push(Math.min(1, norm * tilt));
        }
        
        // Calculate average for effects
        const avgValue = processedData.reduce((a, b) => a + b, 0) / processedData.length;
        const avgNormalized = avgValue;
        const isQuiet = avgNormalized < 0.05;
        const pulseScale = 0.85 + avgNormalized * 0.3;
        
        circularRotation += 0.008 + avgNormalized * 0.012;
        
        // Draw center glow (no shadowBlur - use gradient instead)
        const centerGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * pulseScale * 1.5);
        centerGradient.addColorStop(0, `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, ${0.2 + avgNormalized * 0.2})`);
        centerGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = centerGradient;
        ctx.fillRect(centerX - baseRadius * 2, centerY - baseRadius * 2, baseRadius * 4, baseRadius * 4);
        
        // Batch draw all bars (single path per color group for performance)
        const innerRadius = baseRadius * pulseScale;
        
        // Draw mirrored bars
        for (let i = 0; i < numBars; i++) {
            const value = processedData[i];
            const intensity = value;
            
            // Map to half circle, then mirror
            const halfAngle = (i / numBars) * Math.PI;
            const angle1 = halfAngle + circularRotation;
            const angle2 = -halfAngle + circularRotation + Math.PI;
            
            if (isQuiet && intensity === 0) {
                continue;
            }
            const minLength = isQuiet ? 0 : 2 + avgNormalized * 8;
            const energyScale = 0.25 + avgNormalized * 0.75;
            const barLength = minLength + intensity * (maxRadius - baseRadius) * energyScale;
            
            // Color varies with frequency
            const hueShift = (i / numBars) * 50;
            const r = Math.min(255, primaryRgb.r + hueShift);
            const g = primaryRgb.g;
            const b = Math.min(255, primaryRgb.b - hueShift * 0.4);
            
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.5 + intensity * 0.5})`;
            ctx.lineWidth = 2 + intensity * 2;
            
            // Only apply shadow to high-intensity bars
            if (intensity > 0.6) {
                ctx.shadowBlur = 10;
                ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
            } else {
                ctx.shadowBlur = 0;
            }
            
            // Draw both mirrored bars
            ctx.beginPath();
            ctx.moveTo(centerX + Math.cos(angle1) * innerRadius, centerY + Math.sin(angle1) * innerRadius);
            ctx.lineTo(centerX + Math.cos(angle1) * (innerRadius + barLength), centerY + Math.sin(angle1) * (innerRadius + barLength));
            ctx.moveTo(centerX + Math.cos(angle2) * innerRadius, centerY + Math.sin(angle2) * innerRadius);
            ctx.lineTo(centerX + Math.cos(angle2) * (innerRadius + barLength), centerY + Math.sin(angle2) * (innerRadius + barLength));
            ctx.stroke();
        }
        
        // Draw outer ring
        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.3)`;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
    }
    
    // Draw ambient animation (no audio input) - OPTIMIZED VERSION
    let ambientTime = 0;
    function drawAmbientVisualizer() {
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                return;
            }
        }
        ambientTime += 0.02;
        const colors = getThemeColors();
        const primaryRgb = hexToRgb(colors.primary);
        
        // Faster fade for performance
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.38;
        
        // Simplified: 2 rings only, fewer bars, NO shadowBlur (major performance gain)
        const rings = [
            { radius: 0.4, bars: 40, speed: 0.8, direction: 1 },
            { radius: 0.85, bars: 56, speed: 0.4, direction: -1 }
        ];
        
        // Pre-calculate common values
        const time2 = ambientTime * 2;
        const time1_5 = ambientTime * 1.5;
        
        rings.forEach((ring, ringIndex) => {
            const baseRadius = maxRadius * ring.radius;
            const barCount = ring.bars;
            const rotationOffset = ambientTime * ring.speed * ring.direction;
            
            // Batch drawing with single style per ring for performance
            const hueShift = ringIndex * 20;
            const r = Math.min(255, primaryRgb.r + hueShift);
            const g = primaryRgb.g;
            const b = Math.min(255, primaryRgb.b - hueShift * 0.3);
            
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.7)`;
            ctx.lineWidth = 3;
            
            ctx.beginPath();
            
            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * Math.PI * 2 + rotationOffset;
                
                // Simplified wave calculation
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
        
        // Simple center glow (no shadowBlur)
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
        
        // Guard: ensure canvas has valid dimensions before drawing
        if (canvas.width === 0 || canvas.height === 0) {
            resizeCanvas();
            if (canvas.width === 0 || canvas.height === 0) {
                return;
            }
        }
        
        if (analyser && currentMode !== 3) {
            switch (currentMode) {
                case 0:
                    drawBars();
                    break;
                case 1:
                    drawWaveform();
                    break;
                case 2:
                    drawCircular();
                    break;
            }
        } else if (currentMode === 3) {
            drawAmbientVisualizer();
            return; // drawAmbientVisualizer handles its own animation frame
        }
        
        animationFrame = requestAnimationFrame(drawVisualizer);
    }
    
    // Click handling with delay to detect double-click
    let clickTimeout = null;
    let clickCount = 0;
    
    toggle.addEventListener('click', (e) => {
        // Prevent clicks while initializing
        if (isStartingVisualizer) return;
        
        clickCount++;
        
        if (clickCount === 1) {
            // Wait to see if it's a double-click
            clickTimeout = setTimeout(() => {
                // Single click - toggle on/off
                if (!isActive) {
                    startVisualizer();
                } else {
                    stopVisualizer();
                }
                clickCount = 0;
            }, 250); // 250ms to detect double-click
        } else if (clickCount === 2) {
            // Double-click - cycle modes
            clearTimeout(clickTimeout);
            clickCount = 0;
            
            if (isActive) {
                cycleMode();
            } else {
                // If not active, start in next mode
                cycleMode();
            }
        }
    });

    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            if (isStartingVisualizer) return; // Prevent clicks while initializing
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

    // Initialize visibility on load
    updateVisualizerUI();
}

// Initialize easter eggs when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initReactiveGlitchHeader();
    initConsoleEasterEgg();
    initAudioVisualizer();
});