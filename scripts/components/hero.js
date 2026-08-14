import { HERO_PHASES, coarsePointerQuery, heroScrambleLowercase, reducedMotionQuery } from "../core/constants.js?v=47";
import { body, html } from "../core/dom.js?v=47";
import { onScrollSettle, setScrollGate, smoothScrollToSection } from "../core/scroll.js?v=47";
import { getCurrentSection } from "../core/sections.js?v=47";
import { getDisplayName, isEntered, markEntered, setDisplayName } from "../core/state.js?v=47";
import { easeOutBack, formatDisplayName, isMobileHeroMode, scrambleHeroText, scrambleHeroTextOut } from "../core/utils.js?v=47";

export const enterForm = document.getElementById("enterForm");

const nameInput = document.getElementById("name");

export const enterButton = document.getElementById("enterButton");

export const hero = document.querySelector(".hero");

const heroContent = document.querySelector(".content");

const heroVisual = document.getElementById("heroVisual");

const heroMainImages = document.querySelectorAll(".hero-main-image");

const heroEnteredName = document.getElementById("heroEnteredName");

const heroExpandWordLeft = document.querySelector(".hero-expand-word-left");

const heroExpandWordRight = document.querySelector(".hero-expand-word-right");

export const heroState = {
    phase: HERO_PHASES.IDLE,
    progress: 0,
    isStoryUnlocked: false,
    isAwaitingAutoScroll: false
};

// The hero is scrubbed in two acts, each with its own eased track:
//   act 1 (before entering) opens the collapsed card out to full screen,
//   act 2 (after the name is submitted) shrinks it into the comma.
// `target` is where the wheel has asked to be, `progress` is what is rendered,
// `distance` is how much wheel delta one full act costs.
const heroExpandTrack = {
    progress: 0,
    target: 0,
    frame: null,
    // low on purpose: the card keeps easing after the wheel stops, which is the
    // whole point of scrubbing it rather than tracking the wheel one to one
    lerp: 0.055,
    distance: 1400,
    settleDistance: 0.0015
};

const heroStoryTrack = {
    progress: 0,
    target: 0,
    frame: null,
    lerp: 0.14,
    distance: 1120,
    settleDistance: 0.0015
};

// Where the squeeze bottoms out: past this the pull is capped, so holding the
// copy any longer just looks stuck. This is the point the rubber band lets go —
// deliberately before the comma has finished forming.
const heroStoryReleaseProgress = 0.82;

const heroTimers = {
    morph: null,
    unlock: null,
    autoScroll: null
};

// The enter form only becomes usable once the media has finished expanding.
let isHeroExpandComplete = false;

// The card doubles as the loading screen: the wheel is dead until the intro
// sequence has finished announcing itself.
let isHeroIntroComplete = false;

// Minimum time each intro line stays up. On a warm cache the image is ready
// almost immediately, and a "Loading" that flashes past is worse than none.
const heroIntroTiming = {
    loadingHold: 620,
    thanksHold: 1400,
    imageTimeout: 9000
};

// Whether the hero runs its scrubbed version. Width alone is the wrong test: a
// 900px desktop window has a wheel, a phone held sideways does not.
function isHeroTouchMode() {
    return coarsePointerQuery.matches || window.innerWidth <= 480;
}

function updateButtonState() {
    if (!nameInput || !enterButton) {
        return;
    }

    enterButton.disabled = isEntered() || nameInput.value.trim() === "";
}

// End of act one: the media fills the hero, so the copy and enter form come out.
function completeHeroExpand() {
    if (isHeroExpandComplete) {
        return;
    }

    isHeroExpandComplete = true;
    writeExpandProgress(1);
    heroExpandTrack.target = 1;

    if (hero) {
        hero.classList.add("is-expanded");
    }

    if (heroContent) {
        heroContent.classList.add("is-intro-ready");
    }

    if (enterForm) {
        enterForm.classList.add("is-visible");
    }

    triggerHeroTextScramble();
    updateButtonState();
}

// End of act two: the comma has settled, so hand the page over to the work.
function completeHeroStory() {
    const projectsSection = document.getElementById("projects");

    if (!projectsSection) {
        return;
    }

    clearHeroStoryCompletionTimer();
    heroState.isAwaitingAutoScroll = true;
    scheduleHeroTimer("autoScroll", 1300, function () {
        smoothScrollToSection(projectsSection);
    });
}

function delay(duration) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, duration);
    });
}

function setHeroTitleWord(element, text, duration, characters) {
    if (!element) {
        return;
    }

    if (!text) {
        element.textContent = "";
        return;
    }

    if (reducedMotionQuery.matches) {
        element.textContent = text;
        return;
    }

    scrambleHeroText(element, text, {
        duration: duration,
        speed: 0.045,
        characters: characters
    });
}

// Scramble a line in; resolves once it has finished resolving.
function scrambleLineIn(leftText, rightText, duration, characters) {
    setHeroTitleWord(heroExpandWordLeft, leftText, duration, characters);
    setHeroTitleWord(heroExpandWordRight, rightText, duration, characters);

    return delay(reducedMotionQuery.matches ? 0 : (duration * 1000) + 140);
}

// Dissolve whatever is on screen back to nothing, so the next line arrives from
// empty instead of being swapped in place.
function scrambleLineOut(duration) {
    if (reducedMotionQuery.matches) {
        setHeroTitleWord(heroExpandWordLeft, "", 0);
        setHeroTitleWord(heroExpandWordRight, "", 0);
        return delay(0);
    }

    scrambleHeroTextOut(heroExpandWordLeft, { duration: duration, speed: 0.04, characters: heroScrambleLowercase });
    scrambleHeroTextOut(heroExpandWordRight, { duration: duration, speed: 0.04, characters: heroScrambleLowercase });

    return delay((duration * 1000) + 120);
}

// Loading -> Thanks for waiting -> Architecture & Design, with the line
// dissolving back to nothing between each one. The wheel stays dead throughout,
// so nobody scrolls past a card that has no picture in it yet.
function startHeroIntroSequence() {
    if (!hero) {
        return;
    }

    hero.classList.add("is-intro-loading");

    let isImageReady = false;

    Promise.race([
        preloadHeroMainImage(),
        delay(heroIntroTiming.imageTimeout)
    ]).then(function () {
        isImageReady = true;
    });

    // Keep pulsing the loading line for as long as the download takes. Each pass
    // is a full in-and-out, so a slow connection looks alive rather than stuck.
    function loadingCycle() {
        return scrambleLineIn("loading...", "", 0.85, heroScrambleLowercase)
            .then(function () {
                return delay(heroIntroTiming.loadingHold);
            })
            .then(function () {
                return scrambleLineOut(0.55);
            })
            .then(function () {
                if (!isImageReady) {
                    return loadingCycle();
                }

                return null;
            });
    }

    loadingCycle()
        .then(function () {
            return scrambleLineIn("thanks for waiting - all set.", "", 1.05, heroScrambleLowercase);
        })
        .then(function () {
            return delay(heroIntroTiming.thanksHold);
        })
        .then(function () {
            return scrambleLineOut(0.6);
        })
        .then(function () {
            // The headline is set differently from the status lines, and the
            // switch happens while the line is empty so nothing jumps size.
            hero.classList.add("is-intro-headline");
            return scrambleLineIn("Architecture", "& Design", 1.15);
        })
        .then(function () {
            isHeroIntroComplete = true;
            hero.classList.remove("is-intro-loading");
            syncHeroExpandMode();
        });
}

function revealHeroMainImage() {
    if (!hero) {
        return;
    }

    window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
            hero.classList.add("is-main-image-ready");
        });
    });
}

// Resolves once every hero image has decoded and been revealed. A failed image
// resolves too — a broken asset must not hold the intro hostage.
function preloadHeroMainImage() {
    if (!hero) {
        return Promise.resolve();
    }

    const images = Array.from(heroMainImages);

    if (!images.length) {
        revealHeroMainImage();
        return Promise.resolve();
    }

    return Promise.all(images.map(function (image) {
        return new Promise(function (resolve, reject) {
            function decodeImage() {
                if (image.decode) {
                    image.decode().then(resolve).catch(resolve);
                    return;
                }

                resolve();
            }

            if (image.complete && image.naturalWidth > 0) {
                decodeImage();
                return;
            }

            image.addEventListener("load", decodeImage, { once: true });
            image.addEventListener("error", reject, { once: true });
        });
    })).then(revealHeroMainImage).catch(function () {
        hero.classList.add("is-main-image-unavailable");
    });
}

// Only the tail of the sentence scrambles. The studio name is a separate span
// carrying its own weight, and scrambleHeroText writes textContent, which would
// flatten that markup away.
function setupDescriptionScrambleAnimation() {
    document.querySelectorAll(".description-tail").forEach(function (tail) {
        if (tail.hasAttribute("data-scramble-ready")) {
            return;
        }

        const descriptionText = tail.textContent.trim();
        tail.setAttribute("data-scramble-ready", "true");
        tail.setAttribute("aria-label", descriptionText);
        tail.textContent = descriptionText;
    });
}

function triggerHeroTextScramble() {
    // The sentence is split across explicit lines, so each line scrambles on its own.
    document.querySelectorAll(".description-copy:not([aria-hidden='true']) .description-tail").forEach(function (tail) {
        scrambleHeroText(tail, tail.getAttribute("aria-label") || tail.textContent.trim(), {
            duration: 2.6,
            speed: 0.055
        });
    });
}

// Mirrors what is being typed into the greeting that plays after entering.
function updateSubtitle() {
    if (!nameInput) {
        return;
    }

    if (isEntered()) {
        if (getDisplayName() !== "" && nameInput.value !== getDisplayName()) {
            nameInput.value = getDisplayName();
        }
        return;
    }

    const enteredName = formatDisplayName(nameInput.value).trim();

    if (heroEnteredName) {
        heroEnteredName.textContent = enteredName === "" ? "Guest" : enteredName;
    }
}

function resetMobileHeroViewport() {
    if (!isMobileHeroMode()) {
        return;
    }

    if (document.activeElement && typeof document.activeElement.blur === "function") {
        document.activeElement.blur();
    }

    if (hero) {
        hero.scrollIntoView({ block: "start", inline: "nearest" });
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    [0, 90, 260].forEach(function (delay) {
        window.setTimeout(function () {
            if (hero) {
                hero.scrollIntoView({ block: "start", inline: "nearest" });
            }

            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }, delay);
    });
}

function clearHeroStoryCompletionTimer() {
    if (heroTimers.autoScroll) {
        window.clearTimeout(heroTimers.autoScroll);
        heroTimers.autoScroll = null;
    }
}

function clearHeroStoryUnlockTimer() {
    if (heroTimers.unlock) {
        window.clearTimeout(heroTimers.unlock);
        heroTimers.unlock = null;
    }
}

function clearHeroMorphTimer() {
    if (heroTimers.morph) {
        window.clearTimeout(heroTimers.morph);
        heroTimers.morph = null;
    }
}

function scheduleHeroTimer(timerKey, delay, callback) {
    if (!Object.prototype.hasOwnProperty.call(heroTimers, timerKey)) {
        return null;
    }

    if (heroTimers[timerKey]) {
        window.clearTimeout(heroTimers[timerKey]);
    }

    heroTimers[timerKey] = window.setTimeout(function () {
        heroTimers[timerKey] = null;
        callback();
    }, delay);

    return heroTimers[timerKey];
}

function syncHeroPhaseClasses() {
    if (!hero) {
        return;
    }

    // IDLE / SCRUBBING / COMPLETE are act one, the expansion. ENTERING / MORPHED
    // are act two, which only starts once a name has been submitted.
    const isAfterEnter = heroState.phase === HERO_PHASES.ENTERING || heroState.phase === HERO_PHASES.MORPHED;

    hero.classList.toggle("is-entered", isAfterEnter);
    hero.classList.toggle("is-morph-complete", heroState.phase === HERO_PHASES.MORPHED);
    hero.classList.toggle("is-story-scrubbing", isAfterEnter && heroStoryTrack.progress > 0 && heroStoryTrack.progress < 1);
    hero.classList.toggle("is-story-released", isAfterEnter && heroStoryTrack.progress >= heroStoryReleaseProgress);
    hero.classList.toggle("is-story-complete", isAfterEnter && heroStoryTrack.progress >= 1);
    hero.classList.toggle("is-comma-phase", isAfterEnter && heroStoryTrack.progress >= 0.94);
}

function setHeroPhase(phase) {
    heroState.phase = phase;
    syncHeroPhaseClasses();
}

function resetHeroFlowState() {
    cancelHeroScrub(heroExpandTrack);
    cancelHeroScrub(heroStoryTrack);
    heroState.isAwaitingAutoScroll = false;
    clearHeroMorphTimer();
    clearHeroStoryUnlockTimer();
    clearHeroStoryCompletionTimer();
}

// Held still whenever the wheel has nothing left to scrub but the page should
// not move yet: waiting on the name, or waiting on act two to be released.
export function isHeroScrollLocked() {
    if (isHeroTouchMode()) {
        return false;
    }

    if (!hero) {
        return false;
    }

    if (!isEntered()) {
        return !isHeroStoryActive();
    }

    return window.scrollY <= 6 && (!heroState.isStoryUnlocked || heroState.isAwaitingAutoScroll);
}

function writeExpandProgress(progress) {
    if (!hero) {
        return;
    }

    heroExpandTrack.progress = Math.max(0, Math.min(progress, 1));
    heroState.progress = heroExpandTrack.progress;
    hero.style.setProperty("--hero-expand-progress", heroExpandTrack.progress.toFixed(4));

    if (isEntered()) {
        return;
    }

    setHeroPhase(heroExpandTrack.progress >= 1
        ? HERO_PHASES.COMPLETE
        : (heroExpandTrack.progress > 0 ? HERO_PHASES.SCRUBBING : HERO_PHASES.IDLE));
}

function writeStoryProgress(progress) {
    if (!hero) {
        return;
    }

    heroStoryTrack.progress = Math.max(0, Math.min(progress, 1));

    const basePull = heroStoryTrack.progress;
    const magneticOvershoot = heroStoryTrack.progress >= 0.64
        ? easeOutBack((heroStoryTrack.progress - 0.5) / 0.5, 2.8)
        : 0;
    const magneticPull = Math.min(basePull + (magneticOvershoot * 0.36), 1.38);
    const magneticScale = 1 - (Math.min(magneticPull, 1.24) * 0.22);

    hero.style.setProperty("--hero-story-progress", heroStoryTrack.progress.toFixed(4));
    hero.style.setProperty("--hero-side-pull", magneticPull.toFixed(4));
    hero.style.setProperty("--hero-side-scale", magneticScale.toFixed(4));
    syncHeroPhaseClasses();

    if (heroStoryTrack.progress < 1) {
        clearHeroStoryCompletionTimer();
    }
}

// Act one before entering, act two after — whichever is live owns the wheel.
export function isHeroStoryActive() {
    if (isHeroTouchMode() || reducedMotionQuery.matches) {
        return false;
    }

    if (!hero) {
        return false;
    }

    const isAtHeroTop = window.scrollY <= 6 && getCurrentSection() && getCurrentSection().id === "home";

    if (!isAtHeroTop) {
        return false;
    }

    if (!isEntered()) {
        return isHeroIntroComplete && !isHeroExpandComplete;
    }

    return heroState.isStoryUnlocked;
}

function getActiveHeroTrack() {
    return isEntered() ? heroStoryTrack : heroExpandTrack;
}

function stepHeroTrack(track, write, onComplete, now) {
    const distance = track.target - track.progress;

    if (Math.abs(distance) <= track.settleDistance) {
        track.frame = null;
        track.lastFrame = 0;
        write(track.target);

        if (track.progress >= 1) {
            onComplete();
        }

        return;
    }

    // `lerp` is written as a per-60Hz-frame fraction, so convert it for however
    // long this frame actually was. Without this the scrub runs at double speed
    // on a 120Hz display and stutters whenever a frame is late.
    const elapsed = track.lastFrame ? Math.min(64, now - track.lastFrame) : 16.667;
    const factor = 1 - Math.pow(1 - track.lerp, Math.max(elapsed, 1) / 16.667);

    track.lastFrame = now;
    write(track.progress + (distance * factor));
    track.frame = window.requestAnimationFrame(function (nextNow) {
        stepHeroTrack(track, write, onComplete, nextNow);
    });
}

function startHeroTrack(track) {
    if (track.frame) {
        return;
    }

    const isStory = track === heroStoryTrack;

    track.lastFrame = 0;
    track.frame = window.requestAnimationFrame(function (now) {
        stepHeroTrack(
            track,
            isStory ? writeStoryProgress : writeExpandProgress,
            isStory ? completeHeroStory : completeHeroExpand,
            now
        );
    });
}

function cancelHeroScrub(track) {
    if (track.frame) {
        window.cancelAnimationFrame(track.frame);
        track.frame = null;
    }

    track.target = track.progress;
}

// The wheel delivers coarse, uneven steps, so the raw delta only moves a target
// value; the rendered progress eases toward it a frame at a time.
export function scrubHeroStory(delta) {
    if (!isHeroStoryActive()) {
        return false;
    }

    const track = getActiveHeroTrack();

    // While the eased progress is still catching up to the target the wheel stays
    // captured, otherwise the page would start scrolling underneath an animation
    // that has not finished playing.
    const isSettling = track.frame !== null;
    const isConsumed = isSettling ||
        (delta > 0 && track.target < 1) ||
        (delta < 0 && track.target > 0);

    if (!isConsumed) {
        return false;
    }

    track.target = Math.max(0, Math.min(track.target + (delta / track.distance), 1));
    startHeroTrack(track);

    return true;
}

function unlockPage(name) {
    markEntered(name);
    html.classList.remove("is-locked");
    body.classList.remove("is-locked");
    resetHeroFlowState();
    // The floating nav and anything else gated on entry listen for this.
    document.dispatchEvent(new CustomEvent("portfolio:entered"));
}

function lockEnterForm(name) {
    setDisplayName(name);

    if (nameInput) {
        nameInput.value = name;
        nameInput.blur();
        nameInput.readOnly = true;
        nameInput.disabled = true;
        nameInput.setAttribute("aria-disabled", "true");
    }

    if (enterButton) {
        enterButton.disabled = true;
        enterButton.setAttribute("aria-disabled", "true");
    }
}

function submitEnterForm() {
    if (isEntered()) {
        return;
    }

    const enteredName = nameInput ? formatDisplayName(nameInput.value).trim() : "";

    if (nameInput) {
        nameInput.value = enteredName;
    }

    resetMobileHeroViewport();

    if (enteredName === "") {
        updateButtonState();
        return;
    }

    // Nothing can be submitted before the media has finished expanding — the
    // form is not even reachable until then.
    if (!isHeroExpandComplete) {
        return;
    }

    if (heroEnteredName) {
        heroEnteredName.textContent = enteredName;
    }
    lockEnterForm(enteredName);
    unlockPage(enteredName);

    if (isHeroTouchMode()) {
        setHeroPhase(HERO_PHASES.MORPHED);
        heroState.isStoryUnlocked = true;
        heroState.isAwaitingAutoScroll = true;
        scheduleHeroTimer("autoScroll", 900, function () {
            const projectsSection = document.getElementById("projects");

            if (projectsSection) {
                smoothScrollToSection(projectsSection);
            }
        });
        return;
    }

    // Act two: the copy clears out, "Hello / <name>" arrives, and once it has
    // settled the wheel is handed the comma morph.
    setHeroPhase(HERO_PHASES.ENTERING);

    scheduleHeroTimer("morph", 2140, function () {
        setHeroPhase(HERO_PHASES.MORPHED);

        scheduleHeroTimer("unlock", 1100, function () {
            heroState.isStoryUnlocked = true;
        });
    });
}

// Touch, narrow screens and reduced-motion users never scrub: the media starts
// where the expansion would have ended.
function shouldSkipHeroExpand() {
    return isHeroTouchMode() || reducedMotionQuery.matches;
}

function syncHeroExpandMode() {
    if (isHeroExpandComplete || !shouldSkipHeroExpand()) {
        return;
    }

    completeHeroExpand();
}

export function initHero() {
    html.classList.add("is-locked");
    body.classList.add("is-locked");
    setupDescriptionScrambleAnimation();
    updateButtonState();
    updateSubtitle();
    writeExpandProgress(0);
    writeStoryProgress(0);
    startHeroIntroSequence();
    if (nameInput) {
        nameInput.addEventListener("input", function () {
            updateButtonState();
            updateSubtitle();
        });

        nameInput.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" || event.isComposing || !isMobileHeroMode()) {
                return;
            }

            event.preventDefault();
            submitEnterForm();
        });
    }

    if (enterForm) {
        enterForm.addEventListener("submit", function (event) {
            event.preventDefault();
            submitEnterForm();
        });
    }
    onScrollSettle(function () {
        heroState.isAwaitingAutoScroll = false;
    });
    window.addEventListener("resize", syncHeroExpandMode);
    setScrollGate({
        isLocked: isHeroScrollLocked,
        isStoryActive: isHeroStoryActive,
        scrub: scrubHeroStory
    });
}
