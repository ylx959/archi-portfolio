import { openDrawingsDetail } from "./drawings-detail.js?v=9";

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

function updateDrawingsStackMotion() {
    if (!drawingsTrack || window.innerWidth <= 768) {
        return;
    }

    const cards = Array.from(drawingsTrack.querySelectorAll(".drawings-card"));
    const stickyBaseTop = 148;

    cards.forEach(function (card, index) {
        const rect = card.getBoundingClientRect();
        const cardTop = stickyBaseTop + (index * 14);
        const progress = Math.max(0, Math.min((window.innerHeight - rect.top - 80) / (window.innerHeight - cardTop), 1));
        const scale = 0.94 + (progress * 0.04);

        card.style.setProperty("--drawings-card-scale", scale.toFixed(4));
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
