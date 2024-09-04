let currentTab = null;

function showTab(tabName) {
    const blurb = document.getElementById('blurb');
    const moreAboutMe = document.getElementById('more-about-me');
    const blurbContent = {
        work: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        projects: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        music: '<p class="music-description">From a young age, I was immersed in a rich tapestry of sounds, with my parents often playing The Beatles\' album "1." This early exposure sparked a deep-seated love for music, driving me to learn the guitar and eventually delve into the world of electronic music production. To me, music is more than just melodies and rhythms; it is a profound language that transcends boundaries and speaks to the soul. Through EDM, I find a unique avenue to express my innermost emotions and thoughts, creating connections that I hope resonate deeply with listeners. I am making it my mission to combine the technology of computer science with music to further advance the field and push the boundaries of what is possible.</p>'
    };

    // Fade out the "More About Me" section
    if (moreAboutMe) {
        moreAboutMe.style.opacity = '0';
        setTimeout(() => {
            moreAboutMe.style.display = 'none';
        }, 500); // Wait for fade-out to complete before hiding
    }

    // Update blurb content
    blurb.classList.add('fade-out');
    setTimeout(() => {
        blurb.innerHTML = blurbContent[tabName];
        blurb.classList.remove('fade-out');
        blurb.classList.add('fade-in');
        setTimeout(() => {
            blurb.classList.remove('fade-in');
        }, 250);
    }, 250);

    // Update active tab
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    currentTab = tabName;

    // Show the selected content and apply fade-in effect to entries
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

document.addEventListener('DOMContentLoaded', () => {
    // Ensure no tab is highlighted initially
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));

    // Show the "More About Me" section on initial load
    const moreAboutMe = document.getElementById('more-about-me');
    if (moreAboutMe) {
        moreAboutMe.style.display = 'block';
        moreAboutMe.style.opacity = '1';
    
         // Trigger fade-in animation for gallery images
         const galleryImages = moreAboutMe.querySelectorAll('.gallery-image');
         galleryImages.forEach((img) => {
             img.style.animationPlayState = 'running';
         });
     }

    
    // Ensure no tab is initially active
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
});


function toggleDropdown(element) {
    const dropdown = element.querySelector('.dropdown');
    const isOpen = dropdown.classList.contains('show');
    
    if (isOpen) {
        gsap.to(dropdown, { height: 0, opacity: 0, duration: 0.5, onComplete: () => {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
            // checkDropdownOverlap(); // Check overlap after closing
        }});
    } else {
        dropdown.style.display = 'block';
        dropdown.style.height = 'auto';
        const height = dropdown.clientHeight + 'px';
        dropdown.style.height = 0;
        gsap.to(dropdown, { height: height, opacity: 1, duration: 0.5, onComplete: () => {
            dropdown.classList.add('show');
            dropdown.style.height = 'auto';
            // checkDropdownOverlap(); // Check overlap after opening
        }});
    }
    synchronizeBlinking();
}

function preventDropdown(event) {
    event.stopPropagation();
}

function resetDropdown(event, button) {
    event.stopPropagation(); // Stop the click event from propagating to the parent elements
    console.log("Reset button clicked.");
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

createBlinkingLights();

document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');

    tabs.forEach(tab => {
        tab.addEventListener('mouseenter', function(e) {
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "rgba(0, 255, 0, 0.2)",
                ease: "power2.out",
                borderRadius: "10px" // Add border-radius for hover effect
            });
        });

        tab.addEventListener('mouseleave', function(e) {
            if (!tab.classList.contains('active')) {
                gsap.to(tab, {
                    duration: 0.5,
                    backgroundColor: "transparent",
                    ease: "power2.out",
                    borderRadius: "0px" // Remove border-radius when not active or hovered
                });
            }
        });

        tab.addEventListener('click', function(e) {
            tabs.forEach(t => {
                t.classList.remove('active');
                gsap.to(t, {
                    duration: 0.5,
                    backgroundColor: "transparent",
                    ease: "power2.out",
                    borderRadius: "0px" // Reset border-radius for other tabs
                });
            });
            tab.classList.add('active');
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "rgba(0, 255, 0, 0.2)",
                ease: "power2.out",
                borderRadius: "10px" // Add border-radius for active tab
            });
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const entries = document.querySelectorAll('.entry');
    const dateLocations = document.querySelectorAll('.date-location');

    tabs.forEach(tab => {
        tab.addEventListener('mouseenter', function(e) {
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "rgba(0, 255, 0, 0.2)",
                ease: "power2.out",
                borderRadius: "10px" // Add border-radius for hover effect
            });
        });

        tab.addEventListener('mouseleave', function(e) {
            if (!tab.classList.contains('active')) {
                gsap.to(tab, {
                    duration: 0.5,
                    backgroundColor: "transparent",
                    ease: "power2.out",
                    borderRadius: "0px" // Remove border-radius when not active or hovered
                });
            }
        });

        tab.addEventListener('click', function(e) {
            tabs.forEach(t => {
                t.classList.remove('active');
                gsap.to(t, {
                    duration: 0.5,
                    backgroundColor: "transparent",
                    ease: "power2.out",
                    borderRadius: "0px" // Reset border-radius for other tabs
                });
            });
            tab.classList.add('active');
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "rgba(0, 255, 0, 0.2)",
                ease: "power2.out",
                borderRadius: "10px" // Add border-radius for active tab
            });
        });
    });
});


document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('insta485Video');
    if (video) {
        video.playbackRate = 0.5; // Set playback speed to 0.5x
    }
});


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

    // Add event listeners to slider controls to stop propagation
    carouselContainer.querySelector('.prev').addEventListener('click', function(event) {
        event.stopPropagation();
        plusSlides(-1);
    });

    carouselContainer.querySelector('.next').addEventListener('click', function(event) {
        event.stopPropagation();
        plusSlides(1);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all carousels
    document.querySelectorAll('.carousel-container').forEach(initCarousel);
});