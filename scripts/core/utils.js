import { heroScrambleCharacters } from "./constants.js?v=9";

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
        return;
    }

    const existingTimer = heroScrambleTimers.get(element);

    if (existingTimer) {
        window.clearInterval(existingTimer);
    }

    const duration = options && options.duration ? options.duration : 0.8;
    const speed = options && options.speed ? options.speed : 0.04;
    const characters = options && options.characters ? options.characters : heroScrambleCharacters;
    const steps = Math.max(1, Math.round(duration / speed));
    let step = 0;

    element.textContent = text;
    element.classList.add("is-scrambling");

    const timer = window.setInterval(function () {
        let scrambled = "";
        const progress = step / steps;

        for (let index = 0; index < text.length; index += 1) {
            if (text[index] === " ") {
                scrambled += " ";
                continue;
            }

            if (progress * text.length > index) {
                scrambled += text[index];
            } else {
                scrambled += characters[Math.floor(Math.random() * characters.length)];
            }
        }

        element.textContent = scrambled;
        step += 1;

        if (step > steps) {
            window.clearInterval(timer);
            heroScrambleTimers.delete(element);
            element.textContent = text;
            element.classList.remove("is-scrambling");
        }
    }, speed * 1000);

    heroScrambleTimers.set(element, timer);
}
