import { ScrollTrigger } from "./animation.js";

const sections = ["home", "projects", "drawings", "about", "contact"]
    .map(function (id) {
        return document.getElementById(id);
    })
    .filter(Boolean);

const stackedSections = document.querySelectorAll(".drawings-section, .about-section, .contact-section");
const drawingsSection = document.getElementById("drawings");

export function getCurrentSection() {
    const currentScroll = window.scrollY + 120;
    let currentSection = sections[0];

    sections.forEach(function (section) {
        if (section.offsetTop <= currentScroll) {
            currentSection = section;
        }
    });

    return currentSection;
}

export function isSectionInViewport(section) {
    if (!section) {
        return false;
    }

    const rect = section.getBoundingClientRect();
    const entryThreshold = window.innerHeight * 0.94;
    return rect.top < entryThreshold && rect.bottom > 0;
}

// The stylesheet parks drawings card N at
// `--drawings-stack-top + (N * --drawings-stack-step)` — `.drawings-card`'s
// `top` in drawings.css is the real implementation, and this is the one place
// JS reads the two numbers behind it. Both change at the phone breakpoint, so
// they come off the track rather than being restated as literals; the fallbacks
// are the desktop declarations, for a call made before the stylesheet applies.
export function getDrawingsStack(track) {
    const styles = window.getComputedStyle(track);

    return {
        top: parseFloat(styles.getPropertyValue("--drawings-stack-top")) || 148,
        step: parseFloat(styles.getPropertyValue("--drawings-stack-step")) || 14
    };
}

function updateSectionStackMotion() {
    stackedSections.forEach(function (section) {
        const rect = section.getBoundingClientRect();
        const triggerDistance = Math.min(window.innerHeight * 0.48, 420);
        let progress = 0;

        if (rect.top < triggerDistance) {
            progress = Math.min((triggerDistance - rect.top) / triggerDistance, 1);
        }

        section.style.setProperty("--section-separate", String(progress));
    });

    // `.drawings-section.is-active` drives the heading reveal and nothing else.
    // It used to wait until the sticky heading had pinned, because a bare fade
    // playing while the heading was still travelling up the page looked like a
    // mistake. The heading writes itself now, and an unwritten signature draws
    // nothing at all — so it can be made visible the moment the section enters
    // and the writing, not the fade, is what the eye sees arrive. That earlier
    // reveal is what gives drawings-signature.js the runway to write across.
    if (drawingsSection) {
        drawingsSection.classList.toggle("is-active", isSectionInViewport(drawingsSection));
    }
}

export function initSections() {
    // A page-wide trigger rather than one per section, and a live measurement
    // rather than a scrubbed tween: these sections are `position: sticky` with
    // negative margins, so where they *start* is not a fixed document offset
    // ScrollTrigger could measure once at refresh — the rect is the only honest
    // source. What ScrollTrigger provides is the tick: this now runs on the same
    // frame Lenis writes its scroll position, instead of on a scroll event
    // chasing it through a rAF of its own.
    ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: updateSectionStackMotion,
        onRefresh: updateSectionStackMotion
    });

    updateSectionStackMotion();
}
