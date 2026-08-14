// Entry point. Each component owns its own DOM lookups and state; anything they
// genuinely share lives in ./core. Init order matters only where the original
// single-closure version relied on it: the hero locks the page first, and the
// resize/scroll listeners registered here fire in this order.
import { initAbout } from "./components/about.js?v=57";
import { initContact } from "./components/contact.js?v=57";
import { initCursorFollower } from "./components/cursor-follower.js?v=57";
import { initDrawings } from "./components/drawings.js?v=57";
import { initDrawingsTitle } from "./components/drawings-title.js?v=57";
import { initDrawingsDetail } from "./components/drawings-detail.js?v=57";
import { initFloatingNav } from "./components/floating-nav.js?v=57";
import { initHero } from "./components/hero.js?v=57";
import { initHeroDrop } from "./components/hero-drop.js?v=57";
import { initProjectDetail } from "./components/project-detail.js?v=57";
import { initProjectGrid } from "./components/project-grid.js?v=57";
import { initScroll } from "./core/scroll.js?v=57";
import { initSections } from "./core/sections.js?v=57";

function start() {
    initHero();
    initHeroDrop();
    initScroll();
    initSections();
    initProjectGrid();
    initProjectDetail();
    initDrawings();
    initDrawingsTitle();
    initDrawingsDetail();
    initAbout();
    initContact();
    initCursorFollower();
    initFloatingNav();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
} else {
    start();
}
