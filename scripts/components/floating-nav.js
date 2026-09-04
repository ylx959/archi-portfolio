import { reducedMotionQuery } from "../core/constants.js";
import { onScrollSettle, onWheelActivity, smoothScrollToSection } from "../core/scroll.js";
import { getCurrentSection, isSectionInViewport } from "../core/sections.js";
import { isEntered } from "../core/state.js";

const sectionReturn = document.getElementById("sectionReturn");

const sectionFloatingNav = document.getElementById("sectionFloatingNav");


const sectionFloatingHighlight = document.getElementById("sectionFloatingHighlight");

const sectionFloatingLinks = document.querySelectorAll(".section-floating-link");

const sectionNavs = document.querySelectorAll(".section-floating-nav");

const sectionLinks = document.querySelectorAll('a[href^="#"]');

const protectedLinks = document.querySelectorAll('a[href="#projects"], a[href="#drawings"], a[href="#about"], a[href="#contact"]');

let pendingFloatingNavSectionId = "";

let floatingNavIdleTimer = null;

let floatingNavJellyTimer = null;

let isPointerOverFloatingNav = false;

function isAnyNavVisible() {
    return Array.from(sectionNavs).some(function (nav) {
        if (!nav.classList.contains("is-visible")) {
            return false;
        }

        const rect = nav.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < 120;
    });
}

function updateSectionReturnVisibility() {
    if (!sectionReturn) {
        return;
    }

    const currentSection = getCurrentSection();
    const shouldShow = !!currentSection && currentSection.id === "contact";
    sectionReturn.classList.toggle("is-visible", shouldShow);
}

function clearFloatingNavJellyTimer() {
    if (floatingNavJellyTimer) {
        window.clearTimeout(floatingNavJellyTimer);
        floatingNavJellyTimer = null;
    }
}

function setFloatingNavJellyTarget(targetLink, options) {
    if (!sectionFloatingNav || !sectionFloatingHighlight || !targetLink) {
        return;
    }

    if (sectionFloatingNav.classList.contains("is-collapsed")) {
        sectionFloatingNav.classList.remove("has-jelly-target", "is-jelly-moving");
        return;
    }

    const navRect = sectionFloatingNav.getBoundingClientRect();
    const linkRect = targetLink.getBoundingClientRect();
    const isImmediate = !!(options && options.immediate);
    const highlightX = linkRect.left - navRect.left;
    const highlightY = linkRect.top - navRect.top;
    const glowX = ((highlightX + (linkRect.width / 2)) / Math.max(navRect.width, 1)) * 100;

    sectionFloatingNav.style.setProperty("--nav-highlight-x", highlightX + "px");
    sectionFloatingNav.style.setProperty("--nav-highlight-y", highlightY + "px");
    sectionFloatingNav.style.setProperty("--nav-highlight-width", linkRect.width + "px");
    sectionFloatingNav.style.setProperty("--nav-highlight-height", linkRect.height + "px");
    sectionFloatingNav.style.setProperty("--nav-glow-x", glowX + "%");
    sectionFloatingNav.style.setProperty("--nav-highlight-scale-x", isImmediate ? "1" : "1.18");
    sectionFloatingNav.style.setProperty("--nav-highlight-scale-y", isImmediate ? "1" : "0.92");
    sectionFloatingNav.classList.add("has-jelly-target");

    clearFloatingNavJellyTimer();

    if (isImmediate || reducedMotionQuery.matches) {
        sectionFloatingNav.classList.remove("is-jelly-moving");
        sectionFloatingNav.style.setProperty("--nav-highlight-scale-x", "1");
        sectionFloatingNav.style.setProperty("--nav-highlight-scale-y", "1");
        return;
    }

    sectionFloatingNav.classList.add("is-jelly-moving");
    floatingNavJellyTimer = window.setTimeout(function () {
        sectionFloatingNav.classList.remove("is-jelly-moving");
        sectionFloatingNav.style.setProperty("--nav-highlight-scale-x", "1");
        sectionFloatingNav.style.setProperty("--nav-highlight-scale-y", "1");
        floatingNavJellyTimer = null;
    }, 340);
}

function syncFloatingNavJelly(options) {
    if (!sectionFloatingNav || !sectionFloatingHighlight) {
        return;
    }

    const activeLink = Array.from(sectionFloatingLinks).find(function (link) {
        return link.classList.contains("is-active");
    });

    if (!activeLink || !sectionFloatingNav.classList.contains("is-visible") || sectionFloatingNav.classList.contains("is-collapsed")) {
        sectionFloatingNav.classList.remove("has-jelly-target", "is-jelly-moving");
        return;
    }

    setFloatingNavJellyTarget(activeLink, options);
}

function clearFloatingNavJellyState() {
    if (!sectionFloatingNav) {
        return;
    }

    clearFloatingNavJellyTimer();
    sectionFloatingNav.classList.remove("has-jelly-target", "is-jelly-moving");
    sectionFloatingNav.style.setProperty("--nav-highlight-scale-x", "1");
    sectionFloatingNav.style.setProperty("--nav-highlight-scale-y", "1");
}

function setFloatingNavCollapsed(isCollapsed) {
    if (!sectionFloatingNav) {
        return;
    }

    if (window.innerWidth <= 768) {
        sectionFloatingNav.classList.remove("is-collapsed");
        return;
    }

    if (isCollapsed) {
        clearFloatingNavJellyState();
    }

    sectionFloatingNav.classList.toggle("is-collapsed", isCollapsed);

    if (!isCollapsed) {
        syncFloatingNavJelly({ immediate: true });
    }
}

function shouldWakeFloatingNavOnScroll() {
    if (!sectionFloatingNav || !sectionFloatingNav.classList.contains("is-visible")) {
        return false;
    }

    return window.innerWidth > 768 && window.innerWidth <= 1080;
}

function clearFloatingNavIdleTimer() {
    if (floatingNavIdleTimer) {
        window.clearTimeout(floatingNavIdleTimer);
        floatingNavIdleTimer = null;
    }
}

function scheduleFloatingNavCollapse() {
    if (!sectionFloatingNav || !sectionFloatingNav.classList.contains("is-visible") || window.innerWidth <= 768) {
        return;
    }

    clearFloatingNavIdleTimer();
    floatingNavIdleTimer = window.setTimeout(function () {
        setFloatingNavCollapsed(true);
    }, 800);
}

function wakeFloatingNav() {
    if (!sectionFloatingNav || !sectionFloatingNav.classList.contains("is-visible")) {
        return;
    }

    clearFloatingNavIdleTimer();
    setFloatingNavCollapsed(false);
}

function updateFloatingNavState() {
    if (!sectionFloatingNav) {
        return;
    }

    const currentSection = getCurrentSection();
    const currentId = currentSection ? currentSection.id : "";
    const activeId = pendingFloatingNavSectionId || currentId;
    const shouldShow = isEntered() && (currentId === "projects" || currentId === "drawings" || currentId === "about");

    sectionFloatingNav.classList.toggle("is-visible", shouldShow);

    if (!shouldShow) {
        setFloatingNavCollapsed(false);
        clearFloatingNavIdleTimer();
    } else {
        if (window.innerWidth <= 768) {
            setFloatingNavCollapsed(false);
            clearFloatingNavIdleTimer();
        } else {
            scheduleFloatingNavCollapse();
        }
    }

    sectionFloatingLinks.forEach(function (link) {
        const isActive = link.dataset.sectionLink === activeId;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
            link.setAttribute("aria-current", "page");
        } else {
            link.removeAttribute("aria-current");
        }
    });

    syncFloatingNavJelly({ immediate: true });
}

export function initFloatingNav() {
    protectedLinks.forEach(function (link) {
        link.addEventListener("click", function (event) {
            if (!isEntered()) {
                event.preventDefault();
            }
        });
    });

    sectionLinks.forEach(function (link) {
        const href = link.getAttribute("href");
        const targetId = href ? href.slice(1) : "";
        const targetSection = targetId ? document.getElementById(targetId) : null;

        if (!targetSection) {
            return;
        }

        link.addEventListener("click", function (event) {
            if (!isEntered() && targetId !== "home") {
                return;
            }

            event.preventDefault();
            pendingFloatingNavSectionId = targetId;
            updateFloatingNavState();
            wakeFloatingNav();
            smoothScrollToSection(targetSection);
        });
    });
    if (sectionReturn) {
        sectionReturn.addEventListener("click", function () {
            const currentSection = getCurrentSection();
            const contactSection = document.getElementById("contact");
            const projectsSection = document.getElementById("projects");
            const targetSection = isSectionInViewport(contactSection)
                ? projectsSection
                : currentSection;

            if (targetSection) {
                smoothScrollToSection(targetSection);
            }
        });
    }
    if (sectionFloatingNav) {
        sectionFloatingNav.addEventListener("pointerenter", function () {
            isPointerOverFloatingNav = true;
            wakeFloatingNav();
            syncFloatingNavJelly();
        });
        sectionFloatingNav.addEventListener("pointermove", wakeFloatingNav);
        sectionFloatingNav.addEventListener("focusin", wakeFloatingNav);
        sectionFloatingNav.addEventListener("pointerleave", function () {
            isPointerOverFloatingNav = false;
            clearFloatingNavJellyState();
            scheduleFloatingNavCollapse();
        });
        sectionFloatingNav.addEventListener("focusout", function () {
            window.setTimeout(function () {
                if (sectionFloatingNav && !sectionFloatingNav.contains(document.activeElement)) {
                    clearFloatingNavJellyState();
                    scheduleFloatingNavCollapse();
                }
            }, 0);
        });
    }

    sectionFloatingLinks.forEach(function (link) {
        link.addEventListener("pointerenter", function () {
            setFloatingNavJellyTarget(link);
        });
        link.addEventListener("focus", function () {
            setFloatingNavJellyTarget(link);
        });
    });
    document.addEventListener("portfolio:entered", updateFloatingNavState);
    window.addEventListener("scroll", updateSectionReturnVisibility, { passive: true });
    window.addEventListener("scroll", function () {
        updateFloatingNavState();
        if (isPointerOverFloatingNav || shouldWakeFloatingNavOnScroll()) {
            wakeFloatingNav();
            scheduleFloatingNavCollapse();
        }
    }, { passive: true });
    onWheelActivity(wakeFloatingNav);
    onScrollSettle(function (completed) {
        pendingFloatingNavSectionId = "";

        if (completed) {
            updateFloatingNavState();
        }
    });
    window.addEventListener("resize", updateSectionReturnVisibility);
    window.addEventListener("resize", function () {
        updateFloatingNavState();
        syncFloatingNavJelly({ immediate: true });
    });
    updateSectionReturnVisibility();
    updateFloatingNavState();
}
