// Entry point. Each component owns its own DOM lookups and state; anything they
// genuinely share lives in ./core. Init order matters only where the original
// single-closure version relied on it: the hero locks the page first, and the
// resize/scroll listeners registered here fire in this order.
import { initAbout } from "./components/about.js";
import { initContact } from "./components/contact.js";
import { initCursorFollower } from "./components/cursor-follower.js";
import { initDrawings } from "./components/drawings.js";
import { initDrawingsSignature } from "./components/drawings-signature.js";
import { initDrawingsDetail } from "./components/drawings-detail.js";
import { initFloatingNav } from "./components/floating-nav.js";
import { initHero } from "./components/hero.js";
import { initHeroAmpersand } from "./components/hero-ampersand.js";
import { initHeroHeadline } from "./components/hero-headline.js";
import { initProjectDetail } from "./components/project-detail.js";
import { initProjectGrid } from "./components/project-grid.js";
import { initScroll } from "./core/scroll.js";
import { initSections } from "./core/sections.js";

// The inline rule in index.html kills every transition until this runs — see the
// comment beside it for the Safari first-paint flash it exists to stop. rAF is
// what waits for the bundled stylesheet: while one is pending the browser
// suppresses rendering updates, so the first callback cannot run before the real
// styles are in. Handing transitions back on the second frame rather than the
// first means the values they could animate are already the authored ones, so
// nothing moves when the class comes off.
function releasePreload() {
    document.documentElement.classList.remove("is-preload");
}

function schedulePreloadRelease() {
    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(releasePreload);
    });
    // A frame callback does not run in a background tab, and a page opened in
    // one would carry the suppression — every transition dead — until it was
    // first looked at. `load` fires either way, and like the frame callback it
    // cannot arrive before the stylesheets are in, so it is safe as the floor.
    window.addEventListener("load", releasePreload);
}

function start() {
    initHero();
    initHeroHeadline();
    initHeroAmpersand();
    initScroll();
    initSections();
    initProjectGrid();
    initProjectDetail();
    initDrawings();
    initDrawingsSignature();
    initDrawingsDetail();
    initAbout();
    initContact();
    initCursorFollower();
    initFloatingNav();
}

schedulePreloadRelease();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
    start();
}
