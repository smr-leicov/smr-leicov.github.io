// JavaScript for cube animation and accessible navigation
const links = document.querySelectorAll('nav a');
const cube = document.querySelector('.cube');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('#nav-menu') || document.querySelector('.nav-menu');
let currentActiveLink = links && links.length ? links[0] : null;

// Initialize aria state
if (hamburger) hamburger.setAttribute('aria-expanded', 'false');

function positionCube(linkElement) {
    if (!linkElement || !cube) return;
    const rect = linkElement.getBoundingClientRect();
    const navRect = document.querySelector('nav').getBoundingClientRect();
    const href = linkElement.getAttribute('href');
    const sectionId = href ? href.substring(1) : '';
    cube.className = 'cube ' + (sectionId || 'home');

    if (hamburger && hamburger.offsetParent !== null) {
        const hamburgerRect = hamburger.getBoundingClientRect();
        cube.style.position = 'absolute';
        cube.style.top = (hamburgerRect.top - navRect.top + hamburgerRect.height / 2) + 'px';
        cube.style.left = (hamburgerRect.left - navRect.left + hamburgerRect.width / 2) + 'px';
    } else if (rect) {
        cube.style.position = 'absolute';
        cube.style.top = (rect.top - navRect.top + rect.height / 2) + 'px';
        cube.style.left = (rect.left - navRect.left + rect.width / 2) + 'px';
    }
}

function updateActiveLink() {
    if (!currentActiveLink) return;
    const sections = document.querySelectorAll('section');
    let activeLink = currentActiveLink;
    sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight / 3) {
            const sectionId = section.getAttribute('id');
            const link = document.querySelector(`nav a[href="#${sectionId}"]`);
            if (link) activeLink = link;
        }
    });
    if (activeLink !== currentActiveLink) {
        currentActiveLink.classList.remove('active');
        activeLink.classList.add('active');
        currentActiveLink = activeLink;
    }
    positionCube(currentActiveLink);
}

function openMenu() {
    if (!hamburger || !navMenu) return;
    hamburger.classList.add('active');
    navMenu.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    const first = navMenu.querySelector('a');
    if (first) first.focus();
}

function closeMenu(returnFocus=true) {
    if (!hamburger || !navMenu) return;
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    if (returnFocus) hamburger.focus();
}

function toggleMenu() {
    if (!navMenu) return;
    if (navMenu.classList.contains('active')) closeMenu(); else openMenu();
}

if (hamburger) {
    hamburger.addEventListener('click', function() { toggleMenu(); });
    hamburger.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleMenu(); }
    });
}

// Close menu with Escape and trap focus inside nav menu when open
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { if (navMenu && navMenu.classList.contains('active')) closeMenu(true); }
    if (navMenu && navMenu.classList.contains('active') && e.key === 'Tab') {
        const focusable = navMenu.querySelectorAll('a, button, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
});

if (links) {
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = this.getAttribute('href');
            if (currentActiveLink) currentActiveLink.classList.remove('active');
            this.classList.add('active');
            currentActiveLink = this;
            positionCube(this);
            const target = document.querySelector(href);
            if (target) target.scrollIntoView({ behavior: 'smooth' });
            closeMenu(true);
        });
    });
}

document.addEventListener('click', function(event) { if (!event.target.closest('nav')) closeMenu(false); });
window.addEventListener('resize', function() { if (currentActiveLink) positionCube(currentActiveLink); });
window.addEventListener('scroll', updateActiveLink);

if (currentActiveLink) { currentActiveLink.classList.add('active'); positionCube(currentActiveLink); }
if (cube) cube.className = 'cube home';