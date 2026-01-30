// JavaScript for cube animation and navigation
const links = document.querySelectorAll('nav a');
const cube = document.querySelector('.cube');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
let currentActiveLink = links[0];

// Function to position cube behind active link
function positionCube(linkElement) {
    const rect = linkElement.getBoundingClientRect();
    const navRect = document.querySelector('nav').getBoundingClientRect();
    
    // Get section ID from link and update cube class
    const href = linkElement.getAttribute('href');
    const sectionId = href.substring(1); // Remove the # symbol
    cube.className = 'cube ' + sectionId;
    
    // Check if on mobile (hamburger visible)
    if (hamburger.offsetParent !== null) {
        // Mobile: position behind hamburger button
        const hamburgerRect = hamburger.getBoundingClientRect();
        cube.style.position = 'absolute';
        cube.style.top = (hamburgerRect.top - navRect.top + hamburgerRect.height / 2) + 'px';
        cube.style.left = (hamburgerRect.left - navRect.left + hamburgerRect.width / 2) + 'px';
    } else {
        // Desktop: position behind the active link
        cube.style.position = 'absolute';
        cube.style.top = (rect.top - navRect.top + rect.height / 2) + 'px';
        cube.style.left = (rect.left - navRect.left + rect.width / 2) + 'px';
    }
}

// Function to update active link based on scroll position
function updateActiveLink() {
    const sections = document.querySelectorAll('section');
    let activeLink = currentActiveLink;
    
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        // Check if section is in viewport (top third)
        if (rect.top < window.innerHeight / 3) {
            const sectionId = section.getAttribute('id');
            const link = document.querySelector(`nav a[href="#${sectionId}"]`);
            if (link) {
                activeLink = link;
            }
        }
    });
    
    // Update active class and cube position if changed
    if (activeLink !== currentActiveLink) {
        currentActiveLink.classList.remove('active');
        activeLink.classList.add('active');
        currentActiveLink = activeLink;
    }
    
    positionCube(currentActiveLink);
}

// Hamburger menu toggle
hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

// Close menu when a link is clicked
links.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        const section = href.substring(1); // Remove the # symbol
        
        // Update active link
        currentActiveLink.classList.remove('active');
        this.classList.add('active');
        currentActiveLink = this;
        
        // Position cube behind the clicked link
        positionCube(this);
        
        // Smooth scroll to section
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }

        // Close hamburger menu on mobile
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('nav')) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// Reposition cube on window resize
window.addEventListener('resize', function() {
    positionCube(currentActiveLink);
});

// Update active link on scroll
window.addEventListener('scroll', updateActiveLink);

// Set initial position and add active class to first link
currentActiveLink.classList.add('active');
positionCube(currentActiveLink);
cube.className = 'cube home';