// Entry point. Each component owns its own DOM lookups and state; anything they
// genuinely share lives in ./core. Init order matters only where the original
// single-closure version relied on it: the hero locks the page first, and the
// resize/scroll listeners registered here fire in this order.
import { initAbout } from "./components/about.js?v=fbeff525";
import { initContact } from "./components/contact.js?v=39046b20";
import { initCursorFollower } from "./components/cursor-follower.js?v=0b9e3d7f";
import { initDrawings } from "./components/drawings.js?v=6f1bcae3";
import { initDrawingsTitle } from "./components/drawings-title.js?v=c5bbf45d";
import { initDrawingsDetail } from "./components/drawings-detail.js?v=0f9c1c8f";
import { initFloatingNav } from "./components/floating-nav.js?v=9ef6644c";
import { initHero } from "./components/hero.js?v=e66c8d20";
import { initHeroDrop } from "./components/hero-drop.js?v=a15352a8";
import { initProjectDetail } from "./components/project-detail.js?v=55d63d4b";
import { initProjectGrid } from "./components/project-grid.js?v=aa9a3cee";
import { initScroll } from "./core/scroll.js?v=13019963";
import { initSections } from "./core/sections.js?v=b91de58a";

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
