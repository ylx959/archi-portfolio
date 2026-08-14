const sections = ["home", "projects", "drawings", "about", "contact"]
    .map(function (id) {
        return document.getElementById(id);
    })
    .filter(Boolean);

const stackedSections = document.querySelectorAll(".drawings-section, .about-section, .contact-section");

let isSectionStackTicking = false;

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

// `.drawings-section.is-active` drives the heading reveal and nothing else, so it
// waits until the heading has actually reached its resting position rather than
// firing the moment the section edges into view — otherwise the reveal plays
// while the heading is still travelling up the page.
function isDrawingsHeadingSettled(section) {
    const heading = section.querySelector(".drawings-hero");

    if (!heading) {
        return isSectionInViewport(section);
    }

    const styles = window.getComputedStyle(heading);

    // Mobile lays the heading out statically; there is no resting position to
    // wait for, so fall back to "the section has entered".
    if (styles.position !== "sticky") {
        return isSectionInViewport(section);
    }

    const rect = heading.getBoundingClientRect();
    const stickyTop = parseFloat(styles.top) || 0;

    // sticky has pinned it: it has stopped moving with the page
    return rect.top <= stickyTop + 1 && rect.bottom > 0;
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

    const drawingsSection = document.getElementById("drawings");

    if (drawingsSection) {
        drawingsSection.classList.toggle("is-active", isDrawingsHeadingSettled(drawingsSection));
    }
}

function requestSectionStackMotion() {
    if (isSectionStackTicking) {
        return;
    }

    isSectionStackTicking = true;
    window.requestAnimationFrame(function () {
        updateSectionStackMotion();
        isSectionStackTicking = false;
    });
}

export function initSections() {
    window.addEventListener("scroll", requestSectionStackMotion, { passive: true });
    window.addEventListener("resize", updateSectionStackMotion);
    updateSectionStackMotion();
}
