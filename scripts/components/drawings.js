import { openDrawingsDetail } from "./drawings-detail.js?v=0f9c1c8f";

export const drawingsTrack = document.getElementById("drawingsTrack");

let isDrawingsStackTicking = false;

function getDrawingsVisibleCount() {
    if (window.innerWidth <= 768) {
        return 1;
    }

    if (window.innerWidth <= 1080) {
        return 2;
    }

    return 3;
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

function updateDrawingsStackMotion() {
    if (!drawingsTrack) {
        return;
    }

    const cards = Array.from(drawingsTrack.querySelectorAll(".drawings-card"));
    // Where the stylesheet parks the cards, which differs between the phone and
    // desktop layouts. Read once per pass rather than per card, and from the
    // track rather than duplicated here, so the two cannot drift apart.
    const trackStyles = window.getComputedStyle(drawingsTrack);
    const stickyBaseTop = parseFloat(trackStyles.getPropertyValue("--drawings-stack-top")) || 148;
    const stickyStep = parseFloat(trackStyles.getPropertyValue("--drawings-stack-step")) || 14;

    // Every measurement first, then every write. Interleaving them makes each
    // card's setProperty invalidate style for the next card's rect, so the pass
    // costs one forced layout per card instead of one in total.
    const rects = cards.map(function (card) {
        return card.getBoundingClientRect();
    });

    cards.forEach(function (card, index) {
        const rect = rects[index];
        const cardTop = stickyBaseTop + (index * stickyStep);
        const progress = Math.max(0, Math.min((window.innerHeight - rect.top - 80) / (window.innerHeight - cardTop), 1));
        const scale = 0.94 + (progress * 0.04);

        card.style.setProperty("--drawings-card-scale", scale.toFixed(4));
        card.style.setProperty("--drawings-card-shadow", getCardShadowStrength(rects, index, stickyStep));
    });
}

function requestDrawingsStackMotion() {
    if (isDrawingsStackTicking) {
        return;
    }

    isDrawingsStackTicking = true;
    window.requestAnimationFrame(function () {
        updateDrawingsStackMotion();
        isDrawingsStackTicking = false;
    });
}

export function initDrawings() {
    buildDrawingsLoop();
    requestDrawingsStackMotion();
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
    }
    window.addEventListener("scroll", requestDrawingsStackMotion, { passive: true });
    window.addEventListener("resize", function () {
        buildDrawingsLoop();
        requestDrawingsStackMotion();
    });
}
