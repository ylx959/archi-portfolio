import { ScrollTrigger } from "../core/animation.js";
import { getDrawingsStack } from "../core/sections.js";
import { openDrawingsDetail } from "./drawings-detail.js";

const drawingsTrack = document.getElementById("drawingsTrack");
const drawingsSection = document.querySelector(".drawings-section");
const drawingsHero = document.querySelector(".drawings-hero");

// The eleven cards used to be hand-written <article> blocks in index.html: 121
// lines of markup whose entries differed in three fields. Same move the project
// grid made — the content is data, the markup is built from it. The index and
// the alt text are positional, so they are derived rather than stored.
const drawings = [
    { image: "drawings.png", title: "Blue Bottle series", place: "Palo Alto" },
    { image: "drawings1.png", title: "Blue Bottle series", place: "Nakameguro" },
    { image: "drawings2.JPG", title: "FUJI MT", place: "Lawson" },
    { image: "drawings3.JPG", title: "F1 series", place: "Mercedes-AMG F1 W15" },
    { image: "drawings4.JPG", title: "F1 series", place: "Ferrari SF-23" },
    { image: "drawings5.JPG", title: "Blue Bottle series", place: "Kobe Hankyu" },
    { image: "drawings6.JPG", title: "F1 series", place: "McLaren MP4/4" },
    { image: "drawings7.JPG", title: "Street View series", place: "Bangkok Copenn" },
    { image: "drawings8.png", title: "Cartoon series", place: "Felicity's birthday duck" },
    { image: "drawings9.jpg", title: "Architecture series", place: "Sydney opera house" },
    { image: "drawings10.jpg", title: "Imagination", place: "Floating Library" }
];

function buildDrawingsCards() {
    if (!drawingsTrack || drawingsTrack.children.length) {
        return;
    }

    const imageBase = import.meta.env.BASE_URL + "assets/images/drawings/";

    drawings.forEach(function (drawing, index) {
        const label = String(index + 1).padStart(3, "0");
        const card = document.createElement("article");
        card.className = "drawings-card";

        const wrap = document.createElement("div");
        wrap.className = "drawings-media-wrap";

        const number = document.createElement("span");
        number.className = "drawings-index";
        number.textContent = label;

        const image = document.createElement("img");
        image.className = "drawings-image";
        image.src = imageBase + drawing.image;
        image.alt = "Drawing study " + label;

        const caption = document.createElement("div");
        caption.className = "drawings-caption";

        const title = document.createElement("h3");
        title.textContent = drawing.title;

        const place = document.createElement("p");
        place.textContent = drawing.place;

        caption.append(title, place);
        wrap.append(number, image, caption);
        card.append(wrap);
        drawingsTrack.append(card);
    });
}

function buildDrawingsLoop() {
    if (!drawingsTrack) {
        return;
    }

    drawingsTrack.querySelectorAll(".drawings-card").forEach(function (card, index) {
        card.style.setProperty("--drawings-card-index", String(index));
        card.style.setProperty("--drawings-card-scale", "0.94");
        // The cards are clickable, so expose them to keyboard and assistive tech.
        card.setAttribute("role", "button");
        card.setAttribute("tabindex", "0");
    });
}

// How much of its cast shadow a card should still be showing, from 1 while it
// stands alone down to a remainder once the next card has parked on top of it.
// Measured from the actual distance between the two, not from scroll position:
// that is the thing the eye is reacting to, and it stays correct whatever the
// stack's step and card height happen to be at this breakpoint.
//
// Never reaches 0 — a fully covered card keeps a trace, so the pile still has
// visible seams between its cards rather than fusing into one slab.
function getCardShadowStrength(rects, index, stickyStep) {
    const next = rects[index + 1];

    if (!next) {
        return "1";
    }

    const distance = next.top - rects[index].top;
    // distance === card height: the next card starts exactly where this one ends,
    // nothing is covered. distance === the step: it is parked directly on top.
    const span = Math.max(1, rects[index].height - stickyStep);
    const covered = Math.max(0, Math.min((rects[index].height - distance) / span, 1));

    return (1 - (covered * 0.88)).toFixed(3);
}

// Where the nav should put the visitor when they press Drawings. The default —
// the section's own top — arrives before anything has happened: the heading is
// blank, because it writes itself across the lead-in, and the first drawing is
// still a screen below. The landing is therefore moved down to the first card's
// resting place, which is also where the signature finishes its last stroke, so
// the jump flies through the writing and stops on a finished heading with a
// drawing under it.
//
// `--section-scroll-offset` is the hook core/scroll.js already reads, so this is
// the section stating its own landing rather than the scroller learning about
// drawings. Measured from offsetTop rather than a rect: the card is
// `position: sticky` and its rect lies about where it belongs the moment it is
// pinned, while offsetTop keeps reporting its place in the flow.
function getFlowTop(element) {
    let top = 0;
    let node = element;

    while (node) {
        top += node.offsetTop;
        node = node.offsetParent;
    }

    return top;
}

function updateDrawingsScrollOffset() {
    if (!drawingsSection || !drawingsTrack) {
        return;
    }

    const firstCard = drawingsTrack.querySelector(".drawings-card");
    // A phone lays the heading out in the flow above the cards, so landing on
    // the first card would land past the heading entirely. There the section's
    // own top is the right arrival, which is what an offset of 0 gives.
    const isStacked = drawingsHero && window.getComputedStyle(drawingsHero).position === "sticky";

    if (!firstCard || !isStacked) {
        drawingsSection.style.setProperty("--section-scroll-offset", "0px");
        return;
    }

    const offset = getFlowTop(firstCard) - getFlowTop(drawingsSection) - getDrawingsStack(drawingsTrack).top;

    drawingsSection.style.setProperty("--section-scroll-offset", Math.max(0, Math.round(offset)) + "px");
}

function updateDrawingsStackMotion() {
    if (!drawingsTrack) {
        return;
    }

    const cards = Array.from(drawingsTrack.querySelectorAll(".drawings-card"));
    // Where the stylesheet parks the cards, which differs between the phone and
    // desktop layouts. Read once per pass rather than per card.
    const stack = getDrawingsStack(drawingsTrack);

    // Every measurement first, then every write. Interleaving them makes each
    // card's setProperty invalidate style for the next card's rect, so the pass
    // costs one forced layout per card instead of one in total.
    const rects = cards.map(function (card) {
        return card.getBoundingClientRect();
    });

    cards.forEach(function (card, index) {
        const rect = rects[index];
        // The stylesheet's parking formula, mirrored here and nowhere else in
        // JS — see getDrawingsStack.
        const cardTop = stack.top + (index * stack.step);
        const progress = Math.max(0, Math.min((window.innerHeight - rect.top - 80) / (window.innerHeight - cardTop), 1));
        const scale = 0.94 + (progress * 0.04);

        card.style.setProperty("--drawings-card-scale", scale.toFixed(4));
        card.style.setProperty("--drawings-card-shadow", getCardShadowStrength(rects, index, stack.step));
    });
}

export function initDrawings() {
    buildDrawingsCards();
    buildDrawingsLoop();
    if (drawingsTrack) {
        drawingsTrack.addEventListener("click", function (event) {
            const card = event.target.closest(".drawings-card");
            const image = card ? card.querySelector(".drawings-image") : null;

            if (!card || !image) {
                return;
            }

            openDrawingsDetail(image.getAttribute("src"), image.getAttribute("alt"), card);
        });

        drawingsTrack.addEventListener("keydown", function (event) {
            const card = event.target.closest(".drawings-card");
            const image = card ? card.querySelector(".drawings-image") : null;

            if (!card || !image) {
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDrawingsDetail(image.getAttribute("src"), image.getAttribute("alt"), card);
            }
        });

        // Scoped to the track's own passage through the viewport: the cards are
        // sticky, so the pass has to keep measuring live rects, but there is no
        // reason to pay for it while the drawings are nowhere near the screen —
        // which is what the old page-wide scroll listener did.
        ScrollTrigger.create({
            trigger: drawingsTrack,
            start: "top bottom",
            end: "bottom top",
            onUpdate: updateDrawingsStackMotion,
            onRefresh: updateDrawingsStackMotion
        });

        // The index and the resting scale are written from the stylesheet's
        // breakpoint values, so they have to be rewritten before ScrollTrigger
        // remeasures rather than after it. The nav's landing is measured from
        // the same layout, so it is refreshed alongside them.
        ScrollTrigger.addEventListener("refreshInit", function () {
            buildDrawingsLoop();
            updateDrawingsScrollOffset();
        });
    }

    updateDrawingsScrollOffset();
    updateDrawingsStackMotion();
}
