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

// --- Schedule & speakers, built from program.json ---
// To edit the schedule or the speaker list/abstracts, edit program.json — no HTML/JS changes needed.

const SCHEDULE_ICONS = {
    registration: '<path d="M12.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10.4 12.6a2 2 0 1 1 3 3L8 21l-4 1 1-4Z"/>',
    coffee: '<path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/>',
    lunch: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15.5 14"/>'
};

function makeScheduleIcon(name) {
    const inner = SCHEDULE_ICONS[name];
    if (!inner) return null;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'schedule-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = inner; // fixed, hardcoded shapes only — never from program.json
    return svg;
}

// Auto-links bare URLs found inside plain-text reference strings.
function appendLinkedText(container, text) {
    const urlRegex = /(https?:\/\/\S+)/g;
    let lastIndex = 0;
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        if (match.index > lastIndex) container.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        const a = document.createElement('a');
        a.href = match[0];
        a.textContent = match[0];
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        container.appendChild(a);
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) container.appendChild(document.createTextNode(text.slice(lastIndex)));
}

function createTimelineItem(entry, speakerMap) {
    const li = document.createElement('li');
    li.className = 'timeline-item' + (entry.muted ? ' break' : '');

    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = entry.time;
    li.appendChild(time);

    if (entry.speaker) {
        const speaker = speakerMap[entry.speaker];
        const a = document.createElement('a');
        a.className = 'event talk';
        a.href = '#abstract-' + entry.speaker;

        const titleSpan = document.createElement('span');
        titleSpan.className = 'talk-title';
        titleSpan.textContent = (speaker && speaker.title) || 'Title to be announced';

        const speakerSpan = document.createElement('span');
        speakerSpan.className = 'talk-speaker';
        speakerSpan.textContent = speaker ? speaker.name : entry.speaker;

        a.appendChild(titleSpan);
        a.appendChild(speakerSpan);
        li.appendChild(a);
    } else {
        const event = document.createElement('span');
        event.className = 'event' + (entry.icon ? ' event-icon' : '');
        if (entry.icon) {
            const icon = makeScheduleIcon(entry.icon);
            if (icon) event.appendChild(icon);
        }
        event.appendChild(document.createTextNode(entry.label));
        li.appendChild(event);
    }
    return li;
}

function renderSchedule(days, speakerMap) {
    const tabsContainer = document.getElementById('day-tabs');
    const timelinesContainer = document.getElementById('timelines');
    if (!tabsContainer || !timelinesContainer) return;

    days.forEach((day, i) => {
        const tabId = 'tab-' + day.id;

        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'day-tab' + (i === 0 ? ' active' : '');
        tab.id = tabId;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
        tab.setAttribute('aria-controls', day.id);
        tab.tabIndex = i === 0 ? 0 : -1;
        tab.textContent = day.label;
        tabsContainer.appendChild(tab);

        const ol = document.createElement('ol');
        ol.className = 'timeline';
        ol.id = day.id;
        ol.setAttribute('role', 'tabpanel');
        ol.setAttribute('aria-labelledby', tabId);
        if (i !== 0) ol.hidden = true;
        day.schedule.forEach(entry => {
            try {
                ol.appendChild(createTimelineItem(entry, speakerMap));
            } catch (err) {
                console.error('Skipping malformed schedule entry', entry, err);
            }
        });
        timelinesContainer.appendChild(ol);
    });
}

function createAbstractPanel(speaker) {
    const div = document.createElement('div');
    div.className = 'abstract-panel';
    div.id = 'abstract-' + speaker.id;
    div.setAttribute('role', 'region');
    div.setAttribute('aria-labelledby', 'toggle-' + speaker.id);
    div.hidden = true;

    // Accept either an array of paragraphs or a single string (a common hand-edit slip).
    const paragraphs = Array.isArray(speaker.abstract)
        ? speaker.abstract
        : (typeof speaker.abstract === 'string' && speaker.abstract ? [speaker.abstract] : null);

    if (paragraphs && paragraphs.length) {
        paragraphs.forEach(paragraph => {
            const p = document.createElement('p');
            p.textContent = paragraph;
            div.appendChild(p);
        });
    } else {
        const p = document.createElement('p');
        p.className = 'joint';
        p.textContent = 'Abstract to be announced.';
        div.appendChild(p);
    }

    if (speaker.joint) {
        const p = document.createElement('p');
        p.className = 'joint';
        p.textContent = speaker.joint;
        div.appendChild(p);
    }

    const references = Array.isArray(speaker.references)
        ? speaker.references
        : (typeof speaker.references === 'string' && speaker.references ? [speaker.references] : null);

    if (references && references.length) {
        const p = document.createElement('p');
        p.className = 'references';
        const strong = document.createElement('strong');
        strong.textContent = 'References';
        p.appendChild(strong);
        p.appendChild(document.createElement('br'));
        references.forEach((ref, idx) => {
            appendLinkedText(p, ref);
            if (idx < references.length - 1) p.appendChild(document.createElement('br'));
        });
        div.appendChild(p);
    }

    if (speaker.email) {
        const p = document.createElement('p');
        p.className = 'contact';
        const a = document.createElement('a');
        a.href = 'mailto:' + speaker.email;
        a.textContent = speaker.email;
        p.appendChild(a);
        div.appendChild(p);
    }

    return div;
}

function createSpeakerItem(speaker, scheduleLabel) {
    const li = document.createElement('li');
    li.className = 'speaker-item';

    const h4 = document.createElement('h4');
    h4.className = 'speaker-heading';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'speaker-toggle';
    button.id = 'toggle-' + speaker.id;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', 'abstract-' + speaker.id);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'speaker-title';
    titleSpan.textContent = speaker.title || 'Title to be announced';

    const metaSpan = document.createElement('span');
    metaSpan.className = 'speaker-meta';
    const metaParts = [speaker.name, speaker.affiliation];
    if (scheduleLabel) metaParts.push(scheduleLabel);
    metaSpan.textContent = metaParts.filter(Boolean).join(' · ');

    const chevron = document.createElement('span');
    chevron.className = 'chevron';
    chevron.setAttribute('aria-hidden', 'true');

    button.appendChild(titleSpan);
    button.appendChild(metaSpan);
    button.appendChild(chevron);
    h4.appendChild(button);
    li.appendChild(h4);
    li.appendChild(createAbstractPanel(speaker));
    return li;
}

function renderAccordion(speakers, scheduleLabels) {
    const accordion = document.getElementById('accordion-speakers');
    if (!accordion) return;
    speakers.forEach(speaker => {
        try {
            accordion.appendChild(createSpeakerItem(speaker, scheduleLabels[speaker.id]));
        } catch (err) {
            console.error('Skipping malformed speaker entry', speaker, err);
        }
    });
}

function buildScheduleLabels(days) {
    const labels = {};
    days.forEach(day => {
        day.schedule.forEach(entry => {
            if (entry.speaker) labels[entry.speaker] = day.label + ', ' + entry.time;
        });
    });
    return labels;
}

// --- Wire up day tabs, accordion toggles and schedule<->abstract deep links ---
function wireScheduleInteractions() {
    const dayTabs = document.querySelectorAll('.day-tab');
    const dayPanels = document.querySelectorAll('.timeline');

    function selectDay(tab) {
        dayTabs.forEach(t => {
            const selected = t === tab;
            t.classList.toggle('active', selected);
            t.setAttribute('aria-selected', selected ? 'true' : 'false');
            t.setAttribute('tabindex', selected ? '0' : '-1');
        });
        dayPanels.forEach(p => { p.hidden = p.id !== tab.getAttribute('aria-controls'); });
    }

    dayTabs.forEach((tab, i) => {
        tab.addEventListener('click', () => selectDay(tab));
        tab.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const next = dayTabs[(i + (e.key === 'ArrowRight' ? 1 : dayTabs.length - 1)) % dayTabs.length];
                next.focus();
                selectDay(next);
            }
        });
    });

    function openAbstract(id) {
        const panel = document.getElementById(id);
        const toggle = document.getElementById('toggle-' + id.replace('abstract-', ''));
        if (!panel || !toggle) return;
        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        toggle.closest('.speaker-item').classList.add('open');
    }

    document.querySelectorAll('.speaker-toggle').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const panel = document.getElementById(toggle.getAttribute('aria-controls'));
            if (!panel) return;
            const expanded = toggle.getAttribute('aria-expanded') === 'true';
            panel.hidden = expanded;
            toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
            toggle.closest('.speaker-item').classList.toggle('open', !expanded);
        });
    });

    document.querySelectorAll('a.talk').forEach(talkLink => {
        talkLink.addEventListener('click', (e) => {
            e.preventDefault();
            const id = talkLink.getAttribute('href').substring(1);
            openAbstract(id);
            const target = document.getElementById(id);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    if (location.hash && location.hash.startsWith('#abstract-')) {
        openAbstract(location.hash.substring(1));
    }

    if (window.renderMathInElement) {
        renderMathInElement(document.body, {
            delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false }
            ],
            throwOnError: false
        });
    }
}

fetch('program.json')
    .then(response => {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
    })
    .then(program => {
        const speakerMap = {};
        program.speakers.forEach(speaker => { speakerMap[speaker.id] = speaker; });
        const scheduleLabels = buildScheduleLabels(program.days);

        renderSchedule(program.days, speakerMap);
        renderAccordion(program.speakers, scheduleLabels);
        wireScheduleInteractions();
    })
    .catch(err => {
        console.error('Failed to load program.json', err);
        const fallback = 'Unable to load the schedule right now. Please refresh the page.';
        const timelines = document.getElementById('timelines');
        const accordion = document.getElementById('accordion-speakers');
        if (timelines) timelines.textContent = fallback;
        if (accordion) {
            const li = document.createElement('li');
            li.textContent = fallback;
            accordion.appendChild(li);
        }
    });