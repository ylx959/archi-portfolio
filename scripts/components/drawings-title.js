import { reducedMotionQuery } from "../core/constants.js?v=47";

// "THE MOMENTS / that moved me" — the heading is split into per-character spans
// so it can do two things: float in and out with the section (that part is pure
// CSS, keyed off .drawings-section.is-active), and respond to pointer distance
// by pushing each character's variable-font axes.
//
// Roboto Flex is used here specifically because it carries a width axis; the
// effect is mostly carried by wdth, not weight.

const drawingsTitle = document.querySelector(".drawings-title");
const drawingsSection = document.getElementById("drawings");

const pressure = {
    // how far from a character the pointer still has an effect, in px
    radius: 260,
    weight: { min: 200, max: 900 },
    width: { min: 60, max: 145 },
    // eased falloff makes the near field feel firm and the far field soft
    falloff: 1.7,
    // easing is done here rather than as a CSS transition, see below
    lerp: 0.22
};

// Changing the width axis changes glyph advances, so every distinct value costs
// a relayout of the heading. Quantising means a slow drift writes a handful of
// times instead of once per frame, with no visible stepping at display size.
const weightStep = 20;
const widthStep = 4;
const restEpsilon = 0.6;

// Gap between one character starting to rise and the next. The heading is 23
// characters, so this multiplies up: the tail starts at 22 x this value.
const floatRevealStagger = 75;

let charElements = [];
let charCenters = [];
let charState = [];
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
    charState = charElements.map(function () {
        return {
            weight: pressure.weight.min,
            width: pressure.width.min,
            writtenWeight: -1,
            writtenWidth: -1
        };
    });

    drawingsTitle.style.setProperty("--char-total", String(charElements.length));
    drawingsTitle.style.setProperty("--char-stagger", floatRevealStagger + "ms");
}

// Character boxes are measured in one pass and cached. Measuring per pointermove
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
    measureQueued = true;
}

function isTitleVisible() {
    return !!(drawingsSection && drawingsSection.classList.contains("is-active"));
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

    // No point paying for glyph work while the heading is faded out.
    const isEngaged = hasPointer && isTitleVisible();
    let isSettled = true;

    for (let index = 0; index < charElements.length; index += 1) {
        const state = charState[index];
        const center = charCenters[index];
        const distance = isEngaged
            ? Math.hypot(pointerX - center.x, pointerY - center.y)
            : Infinity;
        const nearness = distance < pressure.radius
            ? Math.pow(1 - (distance / pressure.radius), pressure.falloff)
            : 0;
        const targetWeight = pressure.weight.min + ((pressure.weight.max - pressure.weight.min) * nearness);
        const targetWidth = pressure.width.min + ((pressure.width.max - pressure.width.min) * nearness);

        state.weight += (targetWeight - state.weight) * pressure.lerp;
        state.width += (targetWidth - state.width) * pressure.lerp;

        if (Math.abs(targetWeight - state.weight) > restEpsilon || Math.abs(targetWidth - state.width) > restEpsilon) {
            isSettled = false;
        } else {
            state.weight = targetWeight;
            state.width = targetWidth;
        }

        const nextWeight = Math.round(state.weight / weightStep) * weightStep;
        const nextWidth = Math.round(state.width / widthStep) * widthStep;

        // Skipping unchanged writes keeps a slow pointer from relaying out the
        // whole heading on every single frame.
        if (nextWeight !== state.writtenWeight) {
            state.writtenWeight = nextWeight;
            charElements[index].style.setProperty("--char-wght", String(nextWeight));
        }

        if (nextWidth !== state.writtenWidth) {
            state.writtenWidth = nextWidth;
            charElements[index].style.setProperty("--char-wdth", String(nextWidth));
        }
    }

    // Keep the loop alive only while something is still moving.
    if (!isSettled) {
        renderFrame = window.requestAnimationFrame(applyPressure);
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

function handleScroll() {
    queueMeasure();

    if (hasPointer) {
        requestPressureRender();
    }
}

export function initDrawingsTitle() {
    if (!drawingsTitle || drawingsTitle.hasAttribute("data-title-ready")) {
        return;
    }

    buildTitleMarkup();
    queueMeasure();

    // The float in/out is handled entirely by CSS off .drawings-section.is-active,
    // so nothing here needs to drive it.
    if (reducedMotionQuery.matches) {
        return;
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", releasePressure, { passive: true });
    window.addEventListener("blur", releasePressure);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", queueMeasure);
}
