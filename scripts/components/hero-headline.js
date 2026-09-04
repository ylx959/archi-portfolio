import { gsap } from "../core/animation.js";
import { reducedMotionQuery } from "../core/constants.js";

// "Architecture" and "Design" do not fall in. They grow: every character starts
// at the typeface's hairline weight and thickens to the resting weight, in a
// wave that runs left to right across the whole line. The letters never move —
// only their weight changes — so the words are drawn on rather than delivered.
//
// This is why the headline is set in Petrona rather than EB Garamond. The effect
// needs somewhere below the resting weight to start from, and EB Garamond's
// variable axis bottoms out at 400, which is exactly where the headline rests.
// Petrona's runs 100..900, so 400 has 300 units of room underneath it.
//
// It answers the `headline` target of the hero's drop protocol, the same way
// hero-ampersand.js answers `ampersand` — so nothing here imports the hero and
// the hero does not import this.

const words = Array.from(document.querySelectorAll(".hero-expand-word:not(.hero-expand-word-mid)"));

const reveal = {
    // the axis position each character starts at. Petrona's floor.
    fromWeight: 100,
    // and where it lands — the headline's resting weight, so the animation ends
    // on the design rather than on a state of its own.
    toWeight: 400,
    // how long one character takes to grow
    charDuration: 0.86,
    // and how far apart consecutive characters set off. Small relative to the
    // duration on purpose: the characters have to overlap heavily or the line
    // reads as letters arriving one at a time rather than as a wave crossing it.
    charStagger: 0.05,
    // A hairline at 100 is thin but still perfectly legible, so weight alone
    // starts the line half-written. This fades each character up over the first
    // part of its own growth, which is what makes it emerge from nothing.
    //
    // Kept short on purpose. At 0.34 the fade outlasted the interesting part of
    // the weight ramp and the whole thing read as a grey wipe — the characters
    // looked like they were changing opacity, which is the one thing the
    // reference does not do. Ending it early hands the rest of the growth back
    // to the weight axis, where the effect actually lives.
    fadeDuration: 0.22
};

let entrance = null;

let hasRevealed = false;

// Split into one span per character. Kerning pairs do not survive this — every
// character becomes its own text run — which is the price of giving each one its
// own weight. It is paid back in `settle()`: once the wave has passed, the plain
// text goes back in and the resting headline is kerned properly again.
function split(word) {
    const text = word.textContent;
    const chars = [];
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < text.length; index += 1) {
        const span = document.createElement("span");

        span.className = "hero-expand-char";
        span.textContent = text[index];
        fragment.appendChild(span);
        chars.push(span);
    }

    word.textContent = "";
    word.appendChild(fragment);

    return chars;
}

// Back to plain text, at the resting weight the stylesheet already specifies.
function settle() {
    words.forEach(function (word) {
        if (word.dataset.text) {
            word.textContent = word.dataset.text;
        }
    });
}

function report() {
    hasRevealed = true;
    document.dispatchEvent(new CustomEvent("portfolio:hero-dropped", { detail: { target: "headline" } }));
}

function run() {
    if (!words.length || hasRevealed) {
        report();
        return;
    }

    // Remembered before the split, because the split is what destroys it.
    words.forEach(function (word) {
        word.dataset.text = word.textContent;
    });

    if (reducedMotionQuery.matches) {
        report();
        return;
    }

    if (entrance) {
        entrance.kill();
    }

    // One flat list across both words, so the wave crosses the whole line
    // instead of restarting at "Design".
    const chars = words.reduce(function (all, word) {
        return all.concat(split(word));
    }, []);

    const state = chars.map(function () {
        return { weight: reveal.fromWeight, alpha: 0 };
    });

    function write() {
        for (let index = 0; index < chars.length; index += 1) {
            chars[index].style.setProperty("--char-wght", state[index].weight.toFixed(1));
            chars[index].style.setProperty("--char-reveal", state[index].alpha.toFixed(3));
        }
    }

    write();

    entrance = gsap.timeline({
        onUpdate: write,
        onComplete: function () {
            settle();
            report();
        }
    });

    chars.forEach(function (element, index) {
        const at = index * reveal.charStagger;

        entrance.to(state[index], {
            weight: reveal.toWeight,
            duration: reveal.charDuration,
            ease: "power2.out"
        }, at);
        entrance.to(state[index], {
            alpha: 1,
            duration: reveal.fadeDuration,
            ease: "power1.out"
        }, at);
    });
}

export function initHeroHeadline() {
    if (!words.length) {
        return;
    }

    document.addEventListener("portfolio:hero-drop", function (event) {
        if (event.detail && event.detail.target === "headline") {
            run();
        }
    });
}
