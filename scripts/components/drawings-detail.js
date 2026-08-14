import { body } from "../core/dom.js?v=58";

const drawingsTrack = document.getElementById("drawingsTrack");
const drawingsDetailOverlay = document.getElementById("drawingsDetailOverlay");

const drawingsDetailClose = document.getElementById("drawingsDetailClose");

const drawingsDetailImage = document.getElementById("drawingsDetailImage");

let lastFocusedDrawingCard = null;

let drawingsDetailCloseTimer = null;

let currentDrawingsDetailIndex = -1;

export function openDrawingsDetail(imageSource, imageAlt, sourceCard) {
    if (!drawingsDetailOverlay || !drawingsDetailImage || !imageSource) {
        return;
    }

    lastFocusedDrawingCard = sourceCard || null;
    currentDrawingsDetailIndex = sourceCard && drawingsTrack
        ? Array.from(drawingsTrack.querySelectorAll(".drawings-card")).indexOf(sourceCard)
        : -1;
    drawingsDetailImage.src = imageSource;
    drawingsDetailImage.alt = imageAlt || "";

    if (drawingsDetailCloseTimer) {
        window.clearTimeout(drawingsDetailCloseTimer);
        drawingsDetailCloseTimer = null;
    }

    drawingsDetailOverlay.classList.remove("is-active");
    drawingsDetailOverlay.classList.add("is-visible");
    drawingsDetailOverlay.setAttribute("aria-hidden", "false");
    body.classList.add("is-project-detail-open");

    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            drawingsDetailOverlay.classList.add("is-active");
        });
    });

    if (drawingsDetailClose) {
        window.setTimeout(function () {
            if (drawingsDetailOverlay.classList.contains("is-active")) {
                drawingsDetailClose.focus({ preventScroll: true });
            }
        }, 220);
    }
}

function closeDrawingsDetail() {
    if (!drawingsDetailOverlay) {
        return;
    }

    drawingsDetailOverlay.classList.remove("is-active");
    drawingsDetailOverlay.setAttribute("aria-hidden", "true");
    drawingsDetailCloseTimer = window.setTimeout(function () {
        drawingsDetailOverlay.classList.remove("is-visible");
        drawingsDetailImage.removeAttribute("src");
        drawingsDetailImage.alt = "";
        body.classList.remove("is-project-detail-open");
        currentDrawingsDetailIndex = -1;
        drawingsDetailCloseTimer = null;

        if (lastFocusedDrawingCard && window.innerWidth > 768) {
            lastFocusedDrawingCard.focus({ preventScroll: true });
        }
    }, 320);
}

function setDrawingsDetailImage(index) {
    if (!drawingsTrack || !drawingsDetailImage) {
        return;
    }

    const cards = Array.from(drawingsTrack.querySelectorAll(".drawings-card"));

    if (!cards.length) {
        return;
    }

    const lastIndex = cards.length - 1;
    const nextIndex = index < 0 ? lastIndex : (index > lastIndex ? 0 : index);
    const nextCard = cards[nextIndex];
    const nextImage = nextCard ? nextCard.querySelector(".drawings-image") : null;

    if (!nextImage) {
        return;
    }

    currentDrawingsDetailIndex = nextIndex;
    lastFocusedDrawingCard = nextCard;
    drawingsDetailImage.src = nextImage.getAttribute("src");
    drawingsDetailImage.alt = nextImage.getAttribute("alt") || "";
}

function shiftDrawingsDetailImage(direction) {
    setDrawingsDetailImage(currentDrawingsDetailIndex + direction);
}

export function initDrawingsDetail() {
    if (drawingsDetailClose) {
        drawingsDetailClose.addEventListener("click", closeDrawingsDetail);
    }
    document.addEventListener("keydown", function (event) {
        if (!drawingsDetailOverlay || !drawingsDetailOverlay.classList.contains("is-visible")) {
            return;
        }

        if (event.key === "Escape") {
            closeDrawingsDetail();
        }

        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            shiftDrawingsDetailImage(event.key === "ArrowLeft" ? -1 : 1);
        }
    });
}
