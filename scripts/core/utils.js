import { heroScrambleCharacters } from "./constants.js?v=58";

export function escapeAttribute(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

export function easeInOutCubic(progress) {
    return progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function easeOutBack(progress, overshoot) {
    const clamped = Math.max(0, Math.min(progress, 1));
    const c1 = overshoot;
    const c3 = c1 + 1;

    return 1 + (c3 * Math.pow(clamped - 1, 3)) + (c1 * Math.pow(clamped - 1, 2));
}

export function isMobileHeroMode() {
    return window.innerWidth <= 768;
}

function setStaticText(element, text) {
    if (!element) {
        return;
    }

    element.classList.remove("is-animated");
    element.removeAttribute("aria-label");
    element.textContent = text;
}

export function setButtonText(button, text, textSelector, textClassName) {
    if (!button) {
        return;
    }

    let textElement = button.querySelector(textSelector);

    if (!textElement) {
        textElement = document.createElement("span");
        textElement.className = textClassName;
        button.replaceChildren(textElement);
    }

    textElement.textContent = text;
}

export function triggerOneShotButtonScroll(button, duration) {
    if (!button) {
        return;
    }

    button.classList.remove("is-scrolling");
    void button.offsetWidth;
    button.classList.add("is-scrolling");

    window.setTimeout(function () {
        button.classList.remove("is-scrolling");
    }, duration);
}

function sanitizeDisplayName(value) {
    return (value || "")
        .replace(/\s{2,}/g, " ")
        .replace(/^\s+/, "");
}

export function formatDisplayName(value) {
    return sanitizeDisplayName(value)
        .toLowerCase()
        .replace(/\b[a-z]/g, function (match) {
            return match.toUpperCase();
        });
}

export function formatCategory(category) {
    return (category || "").replace(/^\w/, function (match) {
        return match.toUpperCase();
    });
}

const heroScrambleTimers = new WeakMap();

export function scrambleHeroText(element, text, options) {
    if (!element || !text) {
        return Promise.resolve();
    }

    const existingTimer = heroScrambleTimers.get(element);

    if (existingTimer) {
        window.clearInterval(existingTimer);
    }

    const duration = options && options.duration ? options.duration : 0.8;
    const speed = options && options.speed ? options.speed : 0.04;
    const characters = options && options.characters ? options.characters : heroScrambleCharacters;
    const steps = Math.max(1, Math.round(duration / speed));
    const source = Array.from(text);

    // The line grows out of nothing rather than appearing at full length: each
    // glyph has a point where it shows up as noise, and a later point where it
    // settles into its real character. The jitter keeps it from reading as a
    // mechanical left-to-right wipe.
    const growthWindow = 0.55;
    const appearAt = source.map(function (char, index) {
        return (index / source.length) * growthWindow;
    });
    const settleAt = source.map(function (char, index) {
        return Math.min(1, appearAt[index] + 0.14 + (Math.random() * 0.4));
    });

    element.classList.add("is-scrambling");

    // Resolves when this run actually finishes, not when a wall-clock estimate
    // says it should have. Interval timers overrun — a background tab clamps them
    // to a second — and a caller that guesses will act mid-animation.
    return new Promise(function (resolve) {
    let step = 0;

    const timer = window.setInterval(function () {
        const progress = step / steps;
        let scrambled = "";

        for (let index = 0; index < source.length; index += 1) {
            if (progress < appearAt[index]) {
                break;
            }

            const char = source[index];

            // Spaces and punctuation hold the shape of the line the whole way
            // through, so the reader can see the sentence forming.
            if (!/[A-Za-z0-9]/.test(char) || progress >= settleAt[index]) {
                scrambled += char;
                continue;
            }

            scrambled += characters[Math.floor(Math.random() * characters.length)];
        }

        element.textContent = scrambled;
        step += 1;

        if (step > steps) {
            window.clearInterval(timer);
            heroScrambleTimers.delete(element);
            element.textContent = text;
            element.classList.remove("is-scrambling");
            resolve();
        }
    }, speed * 1000);

    heroScrambleTimers.set(element, timer);
    });
}

// The other half of the effect: the line dissolves back into noise and shortens
// away to nothing, so the next line can be scrambled in from empty rather than
// swapped in place.
export function scrambleHeroTextOut(element, options) {
    if (!element) {
        return Promise.resolve();
    }

    const text = element.textContent;

    if (!text) {
        return Promise.resolve();
    }

    const existingTimer = heroScrambleTimers.get(element);

    if (existingTimer) {
        window.clearInterval(existingTimer);
    }

    const duration = options && options.duration ? options.duration : 0.6;
    const speed = options && options.speed ? options.speed : 0.04;
    const characters = options && options.characters ? options.characters : heroScrambleCharacters;
    const steps = Math.max(1, Math.round(duration / speed));
    const source = Array.from(text);

    element.classList.add("is-scrambling");

    return new Promise(function (resolve) {
    let step = 0;

    const timer = window.setInterval(function () {
        const progress = Math.min(step / steps, 1);
        // The tail falls away first; the glyphs still standing keep churning, so
        // the line reads as dissolving rather than being cut short.
        const standing = Math.max(0, Math.ceil(source.length * (1 - progress)));
        let scrambled = "";

        for (let index = 0; index < standing; index += 1) {
            const char = source[index];

            if (!/[A-Za-z0-9]/.test(char)) {
                scrambled += char;
                continue;
            }

            scrambled += characters[Math.floor(Math.random() * characters.length)];
        }

        element.textContent = scrambled;
        step += 1;

        if (step > steps) {
            window.clearInterval(timer);
            heroScrambleTimers.delete(element);
            element.textContent = "";
            element.classList.remove("is-scrambling");
            resolve();
        }
    }, speed * 1000);

    heroScrambleTimers.set(element, timer);
    });
}
