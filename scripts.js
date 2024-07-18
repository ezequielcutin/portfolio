function showTab(tabName) {
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
}

function toggleDropdown(element) {
    const dropdown = element.querySelector('.dropdown');
    const isOpen = dropdown.classList.contains('show');
    
    if (isOpen) {
        gsap.to(dropdown, { height: 0, opacity: 0, duration: 0.5, onComplete: () => {
            dropdown.classList.remove('show');
            dropdown.style.display = 'none';
        }});
    } else {
        dropdown.style.display = 'block';
        dropdown.style.height = 'auto';
        const height = dropdown.clientHeight + 'px';
        dropdown.style.height = 0;
        gsap.to(dropdown, { height: height, opacity: 1, duration: 0.5, onComplete: () => {
            dropdown.classList.add('show');
            dropdown.style.height = 'auto';
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
    } else {
        profileLinks.classList.remove('collapsed');
    }
}

document.querySelectorAll('.entry').forEach(entry => {
    entry.addEventListener('click', () => {
        setTimeout(checkDropdownOverlap, 600); // Adjust delay to allow for dropdown animation completion
    });
});

document.querySelector('.profile-links .expand-arrow').addEventListener('click', () => {
    document.querySelector('.profile-links').classList.remove('collapsed');
});

// Initial check in case a dropdown is already open on page load
document.addEventListener('DOMContentLoaded', checkDropdownOverlap);