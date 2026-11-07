import { onScrollSettle, smoothScrollToSection } from "../core/scroll.js";
import { getCurrentSection, isSectionInViewport } from "../core/sections.js";
import { isEntered } from "../core/state.js";
import { createGooeyNav } from "./gooey-nav.js";

const sectionReturn = document.getElementById("sectionReturn");

const sectionFloatingNav = document.getElementById("sectionFloatingNav");


const sectionFloatingLinks = document.querySelectorAll(".section-floating-link");

const sectionLinks = document.querySelectorAll('a[href^="#"]');

const protectedLinks = document.querySelectorAll('a[href="#projects"], a[href="#drawings"], a[href="#about"], a[href="#contact"]');

let pendingFloatingNavSectionId = "";

let gooeyNav = null;

function updateSectionReturnVisibility() {
    if (!sectionReturn) {
        return;
    }

    const currentSection = getCurrentSection();
    const shouldShow = !!currentSection && currentSection.id === "contact";
    sectionReturn.classList.toggle("is-visible", shouldShow);
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

    sectionFloatingLinks.forEach(function (link, index) {
        const isActive = link.dataset.sectionLink === activeId;
        link.classList.toggle("is-active", isActive);
        if (isActive) {
            link.setAttribute("aria-current", "page");
            if (gooeyNav) {
                gooeyNav.go(index);
            }
        } else {
            link.removeAttribute("aria-current");
        }
    });
}

export function initFloatingNav() {
    if (sectionFloatingNav) {
        gooeyNav = createGooeyNav(
            sectionFloatingNav.querySelector(".gooey-nav-stage"),
            sectionFloatingNav.querySelector(".gooey-nav-list")
        );
    }

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
    document.addEventListener("portfolio:entered", updateFloatingNavState);
    window.addEventListener("scroll", updateSectionReturnVisibility, { passive: true });
    window.addEventListener("scroll", updateFloatingNavState, { passive: true });
    onScrollSettle(function (completed) {
        pendingFloatingNavSectionId = "";

        if (completed) {
            updateFloatingNavState();
        }
    });
    window.addEventListener("resize", updateSectionReturnVisibility);
    window.addEventListener("resize", updateFloatingNavState);
    updateSectionReturnVisibility();
    updateFloatingNavState();
}
