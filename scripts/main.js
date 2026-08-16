// Entry point. Each component owns its own DOM lookups and state; anything they
// genuinely share lives in ./core. Init order matters only where the original
// single-closure version relied on it: the hero locks the page first, and the
// resize/scroll listeners registered here fire in this order.
import { initAbout } from "./components/about.js";
import { initContact } from "./components/contact.js";
import { initCursorFollower } from "./components/cursor-follower.js";
import { initDrawings } from "./components/drawings.js";
import { initDrawingsTitle } from "./components/drawings-title.js";
import { initDrawingsDetail } from "./components/drawings-detail.js";
import { initFloatingNav } from "./components/floating-nav.js";
import { initHero } from "./components/hero.js";
import { initHeroAmpersand } from "./components/hero-ampersand.js";
import { initHeroDrop } from "./components/hero-drop.js";
import { initHeroHeadline } from "./components/hero-headline.js";
import { initProjectDetail } from "./components/project-detail.js";
import { initProjectGrid } from "./components/project-grid.js";
import { initScroll } from "./core/scroll.js";
import { initSections } from "./core/sections.js";

function start() {
    initHero();
    initHeroDrop();
    initHeroHeadline();
    initHeroAmpersand();
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
