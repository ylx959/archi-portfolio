// Decoder-style text scramble. Framework-agnostic, zero dependencies.
//
//   scrambleIn(el, "Architecture")   noise grows out of nothing and resolves
//   scrambleOut(el)                  dissolves back to an empty string
//
// Both write element.textContent, so the target must be a leaf element that owns
// nothing but text. See SKILL.md for why that matters.

// One timer per element, weakly held: a removed node takes its timer with it
// instead of leaving an interval running against a detached element.
const timers = new WeakMap();

export const SCRAMBLE_MIXED = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export const SCRAMBLE_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const SCRAMBLE_LOWER = "abcdefghijklmnopqrstuvwxyz0123456789";

// Anything that is not a letter or digit holds its place for the whole run, so
// spaces, dashes and full stops keep the shape of the sentence while it forms.
const SCRAMBLABLE = /[A-Za-z0-9]/;

function clearExisting(element) {
    const existing = timers.get(element);

    if (existing) {
        window.clearInterval(existing);
        timers.delete(element);
    }
}

function pick(characters) {
    return characters[Math.floor(Math.random() * characters.length)];
}

/**
 * Grow a line out of noise and resolve it character by character.
 *
 * @param {Element} element        leaf element whose textContent is written
 * @param {string}  text           the final string
 * @param {object}  [options]
 * @param {number}  [options.duration=0.9]     seconds, start to fully resolved
 * @param {number}  [options.speed=0.045]      seconds per frame of noise
 * @param {string}  [options.characters]       the noise alphabet
 * @param {number}  [options.growthWindow=0.55] fraction of the run spent growing
 * @returns {Promise<void>} resolves when the real text is on screen
 */
export function scrambleIn(element, text, options) {
    if (!element || !text) {
        return Promise.resolve();
    }

    clearExisting(element);

    const settings = options || {};
    const duration = settings.duration || 0.9;
    const speed = settings.speed || 0.045;
    const characters = settings.characters || SCRAMBLE_MIXED;
    const growthWindow = settings.growthWindow || 0.55;
    const steps = Math.max(1, Math.round(duration / speed));
    const source = Array.from(text);

    // Two schedules per glyph: when it shows up as noise, and when it settles
    // into its real character. The gap between them is jittered so the line does
    // not resolve as a mechanical left-to-right wipe.
    const appearAt = source.map(function (char, index) {
        return (index / source.length) * growthWindow;
    });
    const settleAt = source.map(function (char, index) {
        return Math.min(1, appearAt[index] + 0.14 + (Math.random() * 0.4));
    });

    return new Promise(function (resolve) {
        let step = 0;

        element.classList.add("is-scrambling");

        const timer = window.setInterval(function () {
            const progress = step / steps;
            let output = "";

            for (let index = 0; index < source.length; index += 1) {
                if (progress < appearAt[index]) {
                    break;
                }

                const char = source[index];

                if (!SCRAMBLABLE.test(char) || progress >= settleAt[index]) {
                    output += char;
                    continue;
                }

                output += pick(characters);
            }

            element.textContent = output;
            step += 1;

            if (step > steps) {
                window.clearInterval(timer);
                timers.delete(element);
                element.textContent = text;
                element.classList.remove("is-scrambling");
                resolve();
            }
        }, speed * 1000);

        timers.set(element, timer);
    });
}

/**
 * Dissolve the current text back into noise and shorten it away to nothing, so
 * the next line can be scrambled in from empty rather than swapped in place.
 *
 * @param {Element} element
 * @param {object}  [options]  duration / speed / characters, as above
 * @returns {Promise<void>} resolves when the element is empty
 */
export function scrambleOut(element, options) {
    if (!element || !element.textContent) {
        return Promise.resolve();
    }

    clearExisting(element);

    const settings = options || {};
    const duration = settings.duration || 0.6;
    const speed = settings.speed || 0.04;
    const characters = settings.characters || SCRAMBLE_MIXED;
    const steps = Math.max(1, Math.round(duration / speed));
    const source = Array.from(element.textContent);

    return new Promise(function (resolve) {
        let step = 0;

        element.classList.add("is-scrambling");

        const timer = window.setInterval(function () {
            const progress = Math.min(step / steps, 1);
            // The tail falls away first; whatever is still standing keeps
            // churning, so the line dissolves rather than being cut short.
            const standing = Math.max(0, Math.ceil(source.length * (1 - progress)));
            let output = "";

            for (let index = 0; index < standing; index += 1) {
                const char = source[index];
                output += SCRAMBLABLE.test(char) ? pick(characters) : char;
            }

            element.textContent = output;
            step += 1;

            if (step > steps) {
                window.clearInterval(timer);
                timers.delete(element);
                element.textContent = "";
                element.classList.remove("is-scrambling");
                resolve();
            }
        }, speed * 1000);

        timers.set(element, timer);
    });
}

/**
 * Replace one line with another: dissolve the old one away, then grow the new
 * one out of nothing. This is the transition, not a swap in place.
 */
export function scrambleTo(element, text, options) {
    return scrambleOut(element, options).then(function () {
        return scrambleIn(element, text, options);
    });
}
