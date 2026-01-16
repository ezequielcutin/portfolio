let currentTab = null;

// ===== BOOT SEQUENCE LOADING SCREEN =====
function initBootSequence() {
    const bootScreen = document.getElementById('boot-screen');
    const bootLines = document.querySelectorAll('.boot-line');
    const progressBar = document.querySelector('.progress-bar');
    const bootHex = document.getElementById('boot-hex');
    
    if (!bootScreen) return;

    // Generate random hex stream
    function generateHex() {
        let hex = '';
        for (let i = 0; i < 200; i++) {
            hex += Math.floor(Math.random() * 16).toString(16).toUpperCase();
            if (i % 4 === 3) hex += ' ';
        }
        return hex;
    }

    // Update hex display rapidly
    const hexInterval = setInterval(() => {
        if (bootHex) bootHex.textContent = generateHex();
    }, 50);

    // Animate boot lines
    bootLines.forEach((line, index) => {
        const delay = parseInt(line.dataset.delay) || index * 200;
        setTimeout(() => {
            line.classList.add('visible');
        }, delay);
    });

    // Animate progress bar (slower for 5 second duration)
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += Math.random() * 3 + 1;
        if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);
        }
        progressBar.style.width = progress + '%';
    }, 100);

    // Hide boot screen after animation
    const totalDuration = 5000;
    setTimeout(() => {
        clearInterval(hexInterval);
        bootScreen.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            bootScreen.remove();
        }, 800);
    }, totalDuration);
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

// ===== 3D TILT EFFECT ON CARDS =====
function init3DTilt() {
    // Exclude entries in the music section
    const entries = document.querySelectorAll('.entry:not(#music .entry)');
    
    entries.forEach(entry => {
        entry.addEventListener('mousemove', (e) => {
            const rect = entry.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / centerY * -8;
            const rotateY = (x - centerX) / centerX * 8;
            
            const mouseXPercent = (x / rect.width) * 100;
            const mouseYPercent = (y / rect.height) * 100;
            
            entry.style.setProperty('--rotateX', `${rotateX}deg`);
            entry.style.setProperty('--rotateY', `${rotateY}deg`);
            entry.style.setProperty('--mouseX', `${mouseXPercent}%`);
            entry.style.setProperty('--mouseY', `${mouseYPercent}%`);
        });

        entry.addEventListener('mouseleave', () => {
            entry.style.setProperty('--rotateX', '0deg');
            entry.style.setProperty('--rotateY', '0deg');
        });
    });
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

    function setContainerRatio(image) {
        if (!container || !image) return;
        const applyRatio = () => {
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            if (!width || !height) return;
            const ratio = (width / height).toFixed(4);
            container.style.aspectRatio = `${ratio} / 1`;
            const maxWidth = Math.min(640, window.innerWidth * 0.9);
            const maxHeight = window.innerHeight * 0.55;
            const targetWidth = Math.min(maxWidth, maxHeight * ratio);
            const widthPx = `${Math.max(280, targetWidth)}px`;
            container.style.width = widthPx;
            if (shell) {
                shell.style.width = widthPx;
            }
        };

        if (image.complete) {
            applyRatio();
        } else {
            image.addEventListener('load', applyRatio, { once: true });
        }
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
        initializeRain();
        setContainerRatio(images[currentIndex]);
    }

    window.addEventListener('resize', resizeCanvas);
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
        
        // Reinitialize 3D tilt effect for newly visible entries
        setTimeout(() => {
            init3DTilt();
        }, 500);

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

function createBlinkingLights() {
    const body = document.body;
    for (let i = 0; i < 50; i++) {
        const light = document.createElement('div');
        light.className = 'blink';
        light.style.position = 'absolute';
        light.style.left = `${Math.random() * 100}%`;
        light.style.top = `${Math.random() * 100}%`;
        light.style.width = '2px';
        light.style.height = '2px';
        light.style.backgroundColor = '#00ff00';
        light.style.borderRadius = '50%';
        light.style.opacity = '0';
        body.appendChild(light);

        setInterval(() => {
            light.style.opacity = Math.random() > 0.5 ? 1 : 0;
        }, Math.random() * 3000 + 500);
    }
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

// Easter Egg 1: Reactive Glitch Header
function initReactiveGlitchHeader() {
    const glitchHeader = document.querySelector('.glitch');
    if (!glitchHeader) return;
    
    let isHovering = false;
    let glitchInterval = null;
    let coolDownTimeout = null;
    
    // --- Audio Synthesis Variables ---
    let audioContext = null;
    let oscillator = null;
    let filter = null;
    let gainNode = null;
    let distortion = null;
    let lfo = null;
    let lfoGain = null;
    let intensityInterval = null;

    glitchHeader.addEventListener('mouseenter', () => {
        isHovering = true;
        if (coolDownTimeout) {
            clearTimeout(coolDownTimeout);
            coolDownTimeout = null;
        }
        intensifyGlitch();
        startAcidSound();
    });
    
    glitchHeader.addEventListener('mouseleave', () => {
        isHovering = false;
        resetGlitch();
        stopAcidSound();
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
    
    function startAcidSound() {
        if (audioContext && audioContext.state !== 'closed') {
             stopAcidSound(true);
        }

        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create two oscillators for a richer, warmer pad sound
            oscillator = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            filter = audioContext.createBiquadFilter();
            gainNode = audioContext.createGain();
            lfo = audioContext.createOscillator();
            lfoGain = audioContext.createGain();

            // Main Oscillator - soft sine wave at a low frequency
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(65.41, audioContext.currentTime); // C2 - deep and warm

            // Second oscillator - slight detune for richness
            oscillator2.type = 'sine';
            oscillator2.frequency.setValueAtTime(130.81, audioContext.currentTime); // C3 - octave up
            oscillator2.detune.setValueAtTime(5, audioContext.currentTime); // Slight detune for shimmer

            // Gentle lowpass filter
            filter.type = 'lowpass';
            filter.Q.value = 1; // Very gentle resonance
            filter.frequency.value = 800;

            // Slow, gentle LFO for subtle movement
            lfo.type = 'sine';
            lfo.frequency.value = 0.5; // Very slow modulation

            // LFO modulates filter subtly
            lfoGain.gain.value = 200;

            // Create a second gain for oscillator2
            const gain2 = audioContext.createGain();
            gain2.gain.value = 0.3; // Quieter layer

            // Connect: oscillators -> filter -> gain -> destination
            oscillator.connect(filter);
            oscillator2.connect(gain2);
            gain2.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Connect LFO to filter frequency
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);

            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            oscillator.start();
            oscillator2.start();
            lfo.start();

            // Gentle fade-in
            gainNode.gain.linearRampToValueAtTime(0.06, audioContext.currentTime + 1.0);

            // Store oscillator2 for cleanup
            window._oscillator2 = oscillator2;
            window._gain2 = gain2;

            // Subtle intensity increase over time
            if (intensityInterval) clearInterval(intensityInterval);
            intensityInterval = setInterval(() => {
                if (!isHovering || !audioContext || audioContext.state === 'closed') {
                    clearInterval(intensityInterval);
                    return;
                }
                // Gently increase filter frequency for slight brightness
                const currentFreq = filter.frequency.value;
                if (currentFreq < 1500) {
                    filter.frequency.linearRampToValueAtTime(currentFreq + 50, audioContext.currentTime + 0.5);
                }
            }, 800);

        } catch (e) {
            console.warn("Could not create ambient sound.", e);
        }
    }

    function stopAcidSound(immediate = false) {
        if (intensityInterval) {
            clearInterval(intensityInterval);
            intensityInterval = null;
        }

        if (gainNode && audioContext && audioContext.state === 'running') {
            // Gentle fade-out
            const fadeOutDuration = immediate ? 0.05 : 1.5; 
            gainNode.gain.cancelScheduledValues(audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeOutDuration);

            setTimeout(() => {
                if (audioContext && audioContext.state !== 'closed') {
                    try {
                        oscillator.stop();
                        if (window._oscillator2) window._oscillator2.stop();
                        lfo.stop();
                    } catch (e) {}
                    audioContext.close().catch(e => {});
                }
                audioContext = null;
                window._oscillator2 = null;
                window._gain2 = null;
            }, (fadeOutDuration * 1000) + 50);
        }
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

// Initialize easter eggs when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initReactiveGlitchHeader();
    initConsoleEasterEgg();
});