let currentTab = null;

function initCyberpunkGallery() {
    const container = document.querySelector('.cyberpunk-gallery-container');
    const images = document.querySelectorAll('.cyberpunk-image');
    let currentIndex = 0;

    // Create matrix rain canvas
    const matrixRain = document.createElement('canvas');
    matrixRain.className = 'matrix-rain';
    container.appendChild(matrixRain);
    const ctx = matrixRain.getContext('2d');

    // Set up matrix rain
    let fontSize = 14;
    let columns = 0;
    let drops = [];

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

    async function transitionImages() {
        images[currentIndex].classList.remove('active');
        currentIndex = (currentIndex + 1) % images.length;

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
                    resolve();
                }
            }, 16); // Run at approximately 60 FPS
        });
    }

    // Resize canvas when window is resized
    function resizeCanvas() {
        initializeRain();
    }

    window.addEventListener('resize', resizeCanvas);
    initializeRain(); // Initialize on load

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
        return; // Don't create cursor aura for mobile or tablet devices
    }
    
    const cursorAura = document.createElement('div');
    cursorAura.className = 'cursor-aura';
    document.body.appendChild(cursorAura);

    document.addEventListener('mousemove', (e) => {
        cursorAura.style.left = `${e.clientX - 20}px`;
        cursorAura.style.top = `${e.clientY - 20}px`;
    });

    const interactiveElements = 'a, button, .entry, video, .plyr__controls *, .plyr__progress *, .plyr__menu *, .soundcloud-block';

    document.querySelectorAll(interactiveElements).forEach((el) => {
        el.addEventListener('mouseenter', () => {
            cursorAura.classList.add('clickable');
        });
        el.addEventListener('mouseleave', () => {
            cursorAura.classList.remove('clickable');
        });
    });

    document.querySelectorAll('.soundcloud-block iframe').forEach((iframe) => {
        iframe.addEventListener('mouseenter', () => {
            cursorAura.style.opacity = '0';
        });
        iframe.addEventListener('mouseleave', () => {
            cursorAura.style.opacity = '1';
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
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
    
    glitchHeader.addEventListener('mouseenter', () => {
        isHovering = true;
        // Clear any pending cooldown to prevent it from interfering
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
        // Restore original text content in case it's in a cooldown state from a previous hover
        glitchHeader.textContent = glitchHeader.getAttribute('data-text') || 'Ezequiel Cutin v33.3';

        // Add intense glitch class
        glitchHeader.classList.add('intense-glitch');
        
        // Create random character swaps
        const originalText = glitchHeader.textContent;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()';
        
        // Clear any existing interval to avoid stacking them
        if (glitchInterval) clearInterval(glitchInterval);

        glitchInterval = setInterval(() => {
            if (!isHovering) {
                clearInterval(glitchInterval);
                glitchInterval = null;
                return;
            };
            
            // Randomly swap some characters
            let newText = originalText;
            for (let i = 0; i < 3; i++) {
                const randomIndex = Math.floor(Math.random() * originalText.length);
                const randomChar = chars[Math.floor(Math.random() * chars.length)];
                newText = newText.substring(0, randomIndex) + randomChar + newText.substring(randomIndex + 1);
            }
            glitchHeader.textContent = newText;
            
            // Reset after a short delay
            setTimeout(() => {
                if (isHovering) {
                    glitchHeader.textContent = originalText;
                }
            }, 100);
        }, 200);
        
        // Add sound effect (optional - creates a subtle audio cue)
        playGlitchSound();
    }
    
    function resetGlitch() {
        glitchHeader.classList.remove('intense-glitch');
        
        if (glitchInterval) {
            clearInterval(glitchInterval);
            glitchInterval = null;
        }
        
        const originalText = glitchHeader.getAttribute('data-text') || 'Ezequiel Cutin v33.3';

        // Helper function to replace char at index
        const replaceAt = (str, index, replacement) => {
            return str.substring(0, index) + replacement + str.substring(index + 1);
        };

        // A few last flickers for a "cool-down" effect
        coolDownTimeout = setTimeout(() => {
            if (!isHovering) { // Check if user hasn't re-hovered
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
    
    function playGlitchSound() {
        // Create a subtle glitch sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // Silently fail if audio context is not supported
        }
    }
}

// Easter Egg 2: Developer Console Greeting
function initConsoleEasterEgg() {
    // ASCII Art for the console
    const asciiArt = `
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║    ███████╗███████╗███████╗███████╗ ██████╗ ██╗   ██╗      ║
    ║    ██╔════╝╚══███╔╝██╔════╝██╔════╝██╔═══██╗██║   ██║      ║
    ║    ███████╗  ███╔╝ █████╗  █████╗  ██║   ██║██║   ██║      ║
    ║    ╚════██║ ███╔╝  ██╔══╝  ██╔══╝  ██║   ██║╚██╗ ██╔╝      ║
    ║    ███████║███████╗███████╗███████╗╚██████╔╝ ╚████╔╝       ║
    ║    ╚══════╝╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═══╝        ║
    ║                                                              ║
    ║                    ╔══════════════════════════════════════╗  ║
    ║                    ║  Ezequiel Cutin v33.3               ║  ║
    ║                    ║  Software Engineer | Data Analyst   ║  ║
    ║                    ║  Sales Engineer | Music Producer    ║  ║
    ║                    ╚══════════════════════════════════════╝  ║
    ║                                                              ║
    ║  Greetings, developer! You've accessed the mainframe.      ║
    ║  Type 'help()' for available commands.                     ║
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