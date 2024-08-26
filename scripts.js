let currentTab = null; // No default tab

function showTab(tabName) {
    const blurb = document.getElementById('blurb');
    const musicDescription = document.querySelector('.music-description');
    const blurbContent = {
        work: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        projects: '<br><p>Hey there! I\'m Ezequiel, a passionate software engineer with a knack for creating innovative solutions. From full-stack web applications to generative AI models, I love diving into projects that challenge me to think outside the box. Why hire me? Because I bring a blend of technical expertise and creative problem-solving to the table, ensuring that every project I work on is both efficient and exciting!</p>',
        music: '<p class="music-description">From a young age, I was immersed in a rich tapestry of sounds, with my parents often playing The Beatles\' album "1." This early exposure sparked a deep-seated love for music, driving me to learn the guitar and eventually delve into the world of electronic music production. To me, music is more than just melodies and rhythms; it is a profound language that transcends boundaries and speaks to the soul. Through EDM, I find a unique avenue to express my innermost emotions and thoughts, creating connections that I hope resonate deeply with listeners. I am making it my mission to combine the technology of computer science with music to further advance the field and push the boundaries of what is possible.</p>'
    };

    const shouldFadeOut = currentTab !== 'music' && tabName === 'music';
    const shouldFadeIn = currentTab === 'music' && tabName !== 'music';

    if (shouldFadeOut || shouldFadeIn) {
        if (shouldFadeOut) {
            blurb.classList.add('fade-out');
            setTimeout(() => {
                blurb.innerHTML = blurbContent[tabName];
                blurb.classList.remove('fade-out');
                blurb.classList.add('fade-in');
                setTimeout(() => {
                    blurb.classList.remove('fade-in');
                }, 250); // match the transition duration in CSS
            }, 250); // match the transition duration in CSS
        } else if (shouldFadeIn) {
            musicDescription.classList.add('fade-out');
            setTimeout(() => {
                blurb.innerHTML = blurbContent[tabName];
                musicDescription.classList.remove('fade-out');
                musicDescription.classList.add('fade-in');
                setTimeout(() => {
                    musicDescription.classList.remove('fade-in');
                }, 250); // match the transition duration in CSS
            }, 250); // match the transition duration in CSS
        }
    } else {
        blurb.innerHTML = blurbContent[tabName];
    }

    setTimeout(() => {
        document.querySelectorAll('.content').forEach(content => {
            content.classList.remove('active');
        });
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
            gsap.to(tab, {
                duration: 0.5,
                backgroundColor: "transparent",
                ease: "power2.out",
                borderRadius: "0px" // Reset border-radius for other tabs
            });
        });
        document.getElementById(tabName).classList.add('active');
        const activeTab = document.querySelector(`.tab[onclick="showTab('${tabName}')"]`);
        activeTab.classList.add('active');
        gsap.to(activeTab, {
            duration: 0.5,
            backgroundColor: "rgba(0, 255, 0, 0.2)",
            ease: "power2.out",
            borderRadius: "10px" // Add border-radius for active tab
        });

        currentTab = tabName; // Update the current tab

        // Apply fade-in effect to entries
        const entries = document.querySelectorAll(`#${tabName} .entry`);
        entries.forEach((entry, index) => {
            entry.classList.remove('fade-in');
            void entry.offsetWidth; // Trigger reflow to restart the animation
            setTimeout(() => {
                entry.classList.add('fade-in');
            }, index * 100); // Stagger the fade-in for each entry
        });
    }, 250); // Ensure the delay matches the transition duration
}

document.addEventListener('DOMContentLoaded', () => {
    // Ensure no tab is highlighted initially
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.content').forEach(content => content.classList.remove('active'));
});


function toggleDropdown(element) {
    const dropdown = element.querySelector('.dropdown');
    const isOpen = dropdown.classList.contains('show');
    
    if (isOpen) {
        gsap.to(dropdown, { height: 0, opacity: 0, duration: 0.5, onComplete: () => {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
            checkDropdownOverlap(); // Check overlap after closing
        }});
    } else {
        dropdown.style.display = 'block';
        dropdown.style.height = 'auto';
        const height = dropdown.clientHeight + 'px';
        dropdown.style.height = 0;
        gsap.to(dropdown, { height: height, opacity: 1, duration: 0.5, onComplete: () => {
            dropdown.classList.add('show');
            dropdown.style.height = 'auto';
            checkDropdownOverlap(); // Check overlap after opening
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

    // Initial check for overlap
    checkOverlap();
    window.addEventListener('resize', checkOverlap);
    window.addEventListener('scroll', checkOverlap);

    const observer = new MutationObserver(checkOverlap);
    const config = { attributes: true, childList: true, subtree: true };

    document.querySelectorAll('.entry, .date-location, .dropdown').forEach(element => {
        observer.observe(element, config);
    });
});


function checkDropdownOverlap() {
    const dropdowns = document.querySelectorAll('.dropdown.show');
    const profileLinks = document.querySelector('.profile-links');
    let isOverlapping = false;

    dropdowns.forEach(dropdown => {
        const dropdownRect = dropdown.getBoundingClientRect();
        const profileLinksRect = profileLinks.getBoundingClientRect();

        if (
            dropdownRect.bottom > profileLinksRect.top &&
            dropdownRect.top < profileLinksRect.bottom &&
            dropdownRect.right > profileLinksRect.left &&
            dropdownRect.left < profileLinksRect.right
        ) {
            isOverlapping = true;
        }
    });

    if (isOverlapping) {
        profileLinks.classList.add('collapsed');
    }
}

function checkOverlap() {
    const profileLinks = document.querySelector('.profile-links');
    const entries = document.querySelectorAll('.entry');
    const dateLocations = document.querySelectorAll('.date-location');
    const dropdowns = document.querySelectorAll('.dropdown.show');

    const profileLinksRect = profileLinks.getBoundingClientRect();
    let isOverlapping = false;

    entries.forEach(entry => {
        const entryRect = entry.getBoundingClientRect();
        if (
            entryRect.bottom > profileLinksRect.top &&
            entryRect.top < profileLinksRect.bottom &&
            entryRect.right > profileLinksRect.left &&
            entryRect.left < profileLinksRect.right
        ) {
            isOverlapping = true;
        }
    });

    dateLocations.forEach(dateLocation => {
        const dateLocationRect = dateLocation.getBoundingClientRect();
        if (
            dateLocationRect.bottom > profileLinksRect.top &&
            dateLocationRect.top < profileLinksRect.bottom &&
            dateLocationRect.right > profileLinksRect.left &&
            dateLocationRect.left < profileLinksRect.right
        ) {
            isOverlapping = true;
        }
    });

    dropdowns.forEach(dropdown => {
        const dropdownRect = dropdown.getBoundingClientRect();
        if (
            dropdownRect.bottom > profileLinksRect.top &&
            dropdownRect.top < profileLinksRect.bottom &&
            dropdownRect.right > profileLinksRect.left &&
            dropdownRect.left < profileLinksRect.right
        ) {
            isOverlapping = true;
        }
    });

    if (isOverlapping) {
        profileLinks.classList.add('collapsed');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.tab');
    const profileLinks = document.querySelector('.profile-links');
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

    document.querySelectorAll('.entry').forEach(entry => {
        entry.addEventListener('click', () => {
            setTimeout(checkDropdownOverlap, 600); // Adjust delay to allow for dropdown animation completion
        });
    });

    document.querySelector('.profile-links .expand-arrow').addEventListener('click', () => {
        profileLinks.classList.toggle('collapsed');
    });

    // Initial check for overlap
    checkOverlap();
    window.addEventListener('resize', checkOverlap);
    window.addEventListener('scroll', checkOverlap);

    const observer = new MutationObserver(checkOverlap);
    const config = { attributes: true, childList: true, subtree: true };

    document.querySelectorAll('.entry, .date-location, .dropdown').forEach(element => {
        observer.observe(element, config);
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