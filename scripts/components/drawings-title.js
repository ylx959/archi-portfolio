import { gsap } from "../core/animation.js";
import { reducedMotionQuery } from "../core/constants.js";

// "THE MOMENTS / that moved me" is pressed by the pointer: every character is its
// own span, and the closer the pointer is, the heavier and wider it gets — `wght`
// and `wdth` on Roboto Flex, written as --char-wght and --char-wdth. It stays
// upright throughout. Out of reach a character falls to the light,
// condensed end of the axes, so the resting heading is the unpressed state, not
// a neutral one. A tap sends a ripple of the same pressure out through the
// letters. The entrance is not this module's: the heading arrives on the plain
// fade of .drawings-hero.

const drawingsTitle = document.querySelector(".drawings-title");

// [unpressed, fully pressed].
const axes = {
    wght: [100, 900],
    wdth: [40, 151]
};

// Pressure reaches zero this far from the pointer, in multiples of the heading's
// font-size. Not its box: the column is much wider than the condensed letters.
const reachInEm = 2.2;

// Fraction of the gap closed per 60Hz frame. Only the pointer eases: the letters
// answer it directly, which is what makes the pressure feel like it is dragged.
const followLerp = 1 / 15;

// All in reaches, so a ripple crosses a phone heading in the same time as a
// desktop one.
const ripple = {
    speed: 2.4,
    band: 0.32,
    life: 1,
    // A held press keeps sending rings for as long as it is down.
    holdInterval: 0.38
};

let chars = [];
let target = null;
let cursor = null;
let ripples = [];
let holdCall = null;
let isTicking = false;

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

function readChars() {
    return Array.from(drawingsTitle.querySelectorAll(".drawings-title-char")).map(function (span) {
        return { span: span, written: "" };
    });
}

function getPointerPressure(distance, reach) {
    return Math.max(0, 1 - (distance / reach));
}

// A ring travelling out from the tap: a character peaks as the front crosses it,
// and the ring loses strength as it ages so it dies out rather than stopping.
function getRipplePressure(distance, reach, time) {
    let calm = 1;

    ripples.forEach(function (item) {
        const age = time - item.time;
        const offset = (distance(item) - (age * ripple.speed * reach)) / (ripple.band * reach);
        const strength = Math.pow(1 - (age / ripple.life), 2);

        calm *= 1 - (Math.exp(-offset * offset) * strength);
    });

    return 1 - calm;
}

function mix(axis, pressure) {
    return axis[0] + ((axis[1] - axis[0]) * pressure);
}

// Measured every frame rather than once: the pressure spans most of the width
// axis, so a character's neighbours move it by far more than the reach can
// ignore. All reads come before all writes, so that is one layout per frame, and
// an idle frame writes nothing and costs none.
function tick(time, deltaTime) {
    const reach = parseFloat(window.getComputedStyle(drawingsTitle).fontSize) * reachInEm;
    const blend = 1 - Math.pow(1 - followLerp, (deltaTime || 16.7) / 16.7);

    const centres = chars.map(function (char) {
        const rect = char.span.getBoundingClientRect();

        return { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) };
    });

    // Until the pointer has moved, the pressure sits in the middle of the letters.
    if (!cursor) {
        cursor = {
            x: 0,
            y: 0
        };
        centres.forEach(function (centre) {
            cursor.x += centre.x / centres.length;
            cursor.y += centre.y / centres.length;
        });
    }

    if (target) {
        cursor.x += (target.x - cursor.x) * blend;
        cursor.y += (target.y - cursor.y) * blend;
    }

    ripples = ripples.filter(function (item) {
        return time - item.time < ripple.life;
    });

    chars.forEach(function (char, index) {
        const centre = centres[index];
        const pressed = getPointerPressure(Math.hypot(cursor.x - centre.x, cursor.y - centre.y), reach);
        const rippled = getRipplePressure(function (item) {
            return Math.hypot(item.x - centre.x, item.y - centre.y);
        }, reach, time);
        const pressure = 1 - ((1 - pressed) * (1 - rippled));
        const wght = mix(axes.wght, pressure).toFixed(0);
        const wdth = mix(axes.wdth, pressure).toFixed(1);
        const written = wght + "/" + wdth;

        if (written === char.written) {
            return;
        }

        char.written = written;
        char.span.style.setProperty("--char-wght", wght);
        char.span.style.setProperty("--char-wdth", wdth);
    });
}

function setTicking(shouldTick) {
    if (shouldTick === isTicking) {
        return;
    }

    isTicking = shouldTick;

    if (shouldTick) {
        gsap.ticker.add(tick);
    } else {
        gsap.ticker.remove(tick);
    }
}

function handlePointerMove(event) {
    target = { x: event.clientX, y: event.clientY };
}

function sendRipple(x, y) {
    ripples.push({ x: x, y: y, time: gsap.ticker.time });
    holdCall = gsap.delayedCall(ripple.holdInterval, sendRipple, [x, y]);
}

function handlePointerRelease() {
    if (holdCall) {
        holdCall.kill();
        holdCall = null;
    }
}

function handlePointerDown(event) {
    handlePointerRelease();
    handlePointerMove(event);
    sendRipple(event.clientX, event.clientY);
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

    // Reduced motion keeps the heading as the stylesheet sets it.
    if (reducedMotionQuery.matches) {
        return;
    }

    // Press on the hero rather than the title, so a tap just off a letter still
    // lands. The pointer is followed everywhere: leaving the heading has to carry
    // the pressure off it, not freeze it at the edge.
    const area = drawingsTitle.closest(".drawings-hero") || drawingsTitle;
    area.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerRelease);
    window.addEventListener("pointercancel", handlePointerRelease);

    // Not a ScrollTrigger: the heading is sticky, so its passage through the
    // viewport is not a fixed document range. This gates a ticker, it animates
    // nothing against the scroll.
    new IntersectionObserver(function (entries) {
        setTicking(entries[entries.length - 1].isIntersecting);
    }).observe(drawingsTitle);
}
