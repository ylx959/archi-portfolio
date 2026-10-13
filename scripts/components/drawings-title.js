import { gsap, ScrollTrigger } from "../core/animation.js";
import { coarsePointerQuery, reducedMotionQuery } from "../core/constants.js";

// "THE MOMENTS / that moved me" swells under the pointer: every character is its
// own span, and the closer the pointer is to one, the heavier and wider it
// gets — `wght` and `wdth` on Roboto Flex, written as --char-wght / --char-wdth.
// The entrance is not this module's: the heading arrives on the plain fade of
// .drawings-hero.

const drawingsTitle = document.querySelector(".drawings-title");

// How far the swell reaches, in multiples of the heading's font-size.
const reachInEm = 1.7;

// Added on top of each character's resting weight and width at full influence.
const weightGain = 260;
const widthGain = 40;

// Fraction of the gap closed per 60Hz frame: the swell follows the pointer
// rather than snapping to it, and relaxes the same way when it leaves.
const followLerp = 0.16;

let chars = [];
let pointer = null;
let isMeasureStale = true;
let isTicking = false;
let reach = 0;

function splitIntoChars(node) {
    Array.from(node.childNodes).forEach(function (child) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            splitIntoChars(child);
            return;
        }

        if (child.nodeType !== Node.TEXT_NODE || !child.textContent.trim()) {
            return;
        }

        const fragment = document.createDocumentFragment();

        Array.from(child.textContent.trim()).forEach(function (letter) {
            const span = document.createElement("span");
            span.className = "drawings-title-char";
            span.setAttribute("aria-hidden", "true");
            span.textContent = letter;
            fragment.appendChild(span);
        });

        child.replaceWith(fragment);
    });
}

// Resting values come from the stylesheet, so the subline keeps its lighter
// weight and swells from there rather than from the display lines' weight.
function readChars() {
    return Array.from(drawingsTitle.querySelectorAll(".drawings-title-char")).map(function (span) {
        const style = window.getComputedStyle(span);

        return {
            span: span,
            baseWght: parseFloat(style.fontWeight) || 400,
            x: 0,
            y: 0,
            influence: 0
        };
    });
}

// Boxes are measured with the swell at rest in mind: a character's centre moves
// a little as its neighbours widen, but following that would make the effect
// chase its own layout. Scrolling and resizing are what actually move them.
function measure() {
    reach = parseFloat(window.getComputedStyle(drawingsTitle).fontSize) * reachInEm;

    chars.forEach(function (char) {
        const rect = char.span.getBoundingClientRect();
        char.x = rect.left + (rect.width / 2);
        char.y = rect.top + (rect.height / 2);
    });

    isMeasureStale = false;
}

function tick(time, deltaTime) {
    if (isMeasureStale) {
        measure();
    }

    const blend = 1 - Math.pow(1 - followLerp, (deltaTime || 16.7) / 16.7);
    let isSettled = true;

    chars.forEach(function (char) {
        let target = 0;

        if (pointer) {
            const distance = Math.hypot(pointer.x - char.x, pointer.y - char.y);
            const closeness = Math.max(0, 1 - (distance / reach));
            // Smoothstep: a soft shoulder at the edge of the reach, so a
            // character does not visibly start swelling from a hard boundary.
            target = closeness * closeness * (3 - (2 * closeness));
        }

        char.influence += (target - char.influence) * blend;

        if (Math.abs(target - char.influence) > 0.002) {
            isSettled = false;
        } else {
            char.influence = target;
        }

        char.span.style.setProperty("--char-wght", (char.baseWght + (weightGain * char.influence)).toFixed(1));
        char.span.style.setProperty("--char-wdth", (100 + (widthGain * char.influence)).toFixed(1));
    });

    if (isSettled && !pointer) {
        gsap.ticker.remove(tick);
        isTicking = false;
    }
}

function startTicking() {
    if (!isTicking) {
        isTicking = true;
        gsap.ticker.add(tick);
    }
}

function handlePointerMove(event) {
    if (event.pointerType === "touch") {
        return;
    }

    pointer = { x: event.clientX, y: event.clientY };
    startTicking();
}

function handlePointerLeave() {
    pointer = null;
    startTicking();
}

export function initDrawingsTitle() {
    if (!drawingsTitle) {
        return;
    }

    // Read before the split, line by line: <br> contributes no space to
    // textContent, and the spans that replace the text are aria-hidden.
    const walker = document.createTreeWalker(drawingsTitle, NodeFilter.SHOW_TEXT);
    const words = [];

    while (walker.nextNode()) {
        if (walker.currentNode.textContent.trim()) {
            words.push(walker.currentNode.textContent.trim());
        }
    }

    drawingsTitle.setAttribute("aria-label", words.join(" "));
    splitIntoChars(drawingsTitle);
    chars = readChars();

    if (coarsePointerQuery.matches || reducedMotionQuery.matches) {
        return;
    }

    // Listening on the hero rather than the title gives the swell room to start
    // before the pointer is on a letter.
    const area = drawingsTitle.closest(".drawings-hero") || drawingsTitle;
    area.addEventListener("pointermove", handlePointerMove);
    area.addEventListener("pointerleave", handlePointerLeave);

    function invalidate() {
        isMeasureStale = true;
    }

    ScrollTrigger.create({
        trigger: area,
        start: "top bottom",
        end: "bottom top",
        onUpdate: invalidate,
        onRefresh: invalidate
    });

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(invalidate);
    }
}
