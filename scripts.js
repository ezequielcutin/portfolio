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
        work: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        projects: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
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

document.addEventListener('DOMContentLoaded', function() {
    // const cursor = document.querySelector('.custom-cursor');
    // const cursorTriangle = cursor.querySelector('.cursor-triangle');
    // const clickables = document.querySelectorAll('a, button, .tab, .entry, .dropdown-content a, .dropdown-content video, .prev, .next, video::-webkit-media-controls-panel *');
    // document.addEventListener('mousemove', (e) => {
    //     cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    // });

    // document.addEventListener('mousedown', () => {
    //     cursor.classList.add('clicking');
    // });

    // document.addEventListener('mouseup', () => {
    //     cursor.classList.remove('clicking');
    // });

    // clickables.forEach((el) => {
    //     el.addEventListener('mouseover', () => {
    //         if (!el.closest('.dropdown-content') || 
    //             (el.closest('.dropdown-content') && 
    //              (el.tagName === 'A' || el.tagName === 'VIDEO' || 
    //               el.classList.contains('prev') || el.classList.contains('next')))) {
    //             cursor.classList.add('hovering');
    //         }
    //     });
    //     el.addEventListener('mouseout', () => {
    //         cursor.classList.remove('hovering');
    //     });
    // });
    
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

// Initialize carousels

// Add any other necessary functions and event listeners