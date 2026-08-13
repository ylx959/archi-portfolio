import { reducedMotionQuery } from "../core/constants.js?v=7";

// "THE MOMENTS / that moved me" — the heading is split into per-character spans
// so it can do two things: float in as the section is scrolled into view, and
// respond to the pointer by pushing each character's variable-font axes.
// Roboto Flex is used here specifically because it carries a width axis; the
// effect is mostly carried by wdth, not weight.

const drawingsTitle = document.querySelector(".drawings-title");

const pressure = {
    // how far from a character the pointer still has an effect, in px
    radius: 240,
    weight: { min: 200, max: 900 },
    width: { min: 60, max: 145 },
    // eased falloff makes the near field feel firm and the far field soft
    falloff: 1.7
};

const floatRevealStagger = 42;

let charElements = [];
let charCenters = [];
let pointerX = -9999;
let pointerY = -9999;
let hasPointer = false;
let measureQueued = false;
let renderFrame = null;

function wrapTitleChars(text, startIndex) {
    return Array.from(text).map(function (char, offset) {
        const safeChar = char === " " ? "&nbsp;" : char;
        return '<span class="drawings-title-char" style="--char-index:' + (startIndex + offset) + '">' + safeChar + "</span>";
    }).join("");
}

function buildTitleMarkup() {
    const subline = drawingsTitle.querySelector(".drawings-title-subline");
    const titleNodes = Array.from(drawingsTitle.childNodes).filter(function (node) {
        return !(subline && node === subline);
    });
    const mainParts = titleNodes
        .map(function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent.trim();
            }

            if (node.nodeName === "BR") {
                return "\n";
            }

            return "";
        })
        .join("")
        .split("\n")
        .map(function (part) {
            return part.trim();
        })
        .filter(Boolean);
    const sublineText = subline ? subline.textContent.trim() : "";

    let charIndexOffset = 0;
    const mainMarkup = mainParts.map(function (part) {
        const markup = '<span class="drawings-title-line" aria-hidden="true">' + wrapTitleChars(part, charIndexOffset) + "</span>";
        charIndexOffset += part.length;
        return markup;
    }).join("<br>");
    const sublineMarkup = subline ? wrapTitleChars(sublineText, charIndexOffset) : "";
    const accessibleMainText = mainParts.join(" ");

    drawingsTitle.setAttribute("data-title-ready", "true");
    drawingsTitle.setAttribute("aria-label", (accessibleMainText + " " + sublineText).trim());
    drawingsTitle.innerHTML =
        mainMarkup + "<br>" +
        '<span class="drawings-title-subline" aria-hidden="true">' + sublineMarkup + "</span>";

    charElements = Array.from(drawingsTitle.querySelectorAll(".drawings-title-char"));
    drawingsTitle.style.setProperty("--char-total", String(charElements.length));
}

// Character boxes are measured in one pass and cached. Doing this per pointermove
// is what makes this kind of effect stutter — every read would force the browser
// to redo layout it has already done.
function measureChars() {
    measureQueued = false;
    charCenters = charElements.map(function (char) {
        const rect = char.getBoundingClientRect();
        return {
            x: rect.left + (rect.width / 2),
            y: rect.top + (rect.height / 2)
        };
    });
}

function queueMeasure() {
    if (measureQueued) {
        return;
    }

    measureQueued = true;
    window.requestAnimationFrame(measureChars);
}

function applyPressure() {
    renderFrame = null;

    // Fold a pending re-measure into this frame. Scrolling moves the sticky
    // heading, so stale centres would lag the pointer by a character or two.
    if (measureQueued) {
        measureChars();
    }

    if (!charCenters.length || charCenters.length !== charElements.length) {
        return;
    }

    for (let index = 0; index < charElements.length; index += 1) {
        const center = charCenters[index];
        const distance = Math.hypot(pointerX - center.x, pointerY - center.y);
        const nearness = hasPointer
            ? Math.pow(Math.max(0, 1 - (distance / pressure.radius)), pressure.falloff)
            : 0;
        const weight = Math.round(pressure.weight.min + ((pressure.weight.max - pressure.weight.min) * nearness));
        const width = Math.round(pressure.width.min + ((pressure.width.max - pressure.width.min) * nearness));

        charElements[index].style.setProperty("--char-wght", String(weight));
        charElements[index].style.setProperty("--char-wdth", String(width));
    }
}

function requestPressureRender() {
    if (renderFrame) {
        return;
    }

    renderFrame = window.requestAnimationFrame(applyPressure);
}

function handlePointerMove(event) {
    if (event.pointerType === "touch") {
        return;
    }

    pointerX = event.clientX;
    pointerY = event.clientY;
    hasPointer = true;
    requestPressureRender();
}

function releasePressure() {
    hasPointer = false;
    requestPressureRender();
}

function observeReveal() {
    if (typeof IntersectionObserver !== "function") {
        drawingsTitle.classList.add("is-revealed");
        return;
    }

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
                return;
            }

            drawingsTitle.classList.add("is-revealed");
            observer.disconnect();
            // character boxes only settle once the float-in has finished
            window.setTimeout(queueMeasure, (charElements.length * floatRevealStagger) + 900);
        });
    }, { threshold: 0.25 });

    observer.observe(drawingsTitle);
}

export function initDrawingsTitle() {
    if (!drawingsTitle || drawingsTitle.hasAttribute("data-title-ready")) {
        return;
    }

    buildTitleMarkup();
    drawingsTitle.style.setProperty("--char-stagger", floatRevealStagger + "ms");
    observeReveal();
    queueMeasure();

    if (reducedMotionQuery.matches) {
        drawingsTitle.classList.add("is-revealed");
        return;
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", releasePressure, { passive: true });
    window.addEventListener("blur", releasePressure);
    window.addEventListener("scroll", queueMeasure, { passive: true });
    window.addEventListener("resize", queueMeasure);
}
