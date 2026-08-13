import { HERO_PHASES, defaultSubtitleText, reducedMotionQuery, descriptionRevealDelay, descriptionRevealDuration, heroIntroDelay } from "../core/constants.js?v=7";
import { body, html } from "../core/dom.js?v=7";
import { onScrollSettle, setScrollGate, smoothScrollToSection } from "../core/scroll.js?v=7";
import { getCurrentSection } from "../core/sections.js?v=7";
import { getDisplayName, isEntered, markEntered, setDisplayName } from "../core/state.js?v=7";
import { easeOutBack, formatDisplayName, isMobileHeroMode, scrambleHeroText } from "../core/utils.js?v=7";

export const enterForm = document.getElementById("enterForm");

const nameInput = document.getElementById("name");

export const enterButton = document.getElementById("enterButton");

export const hero = document.querySelector(".hero");

const heroContent = document.querySelector(".content");

const heroVisual = document.getElementById("heroVisual");

const heroMainImages = document.querySelectorAll(".hero-main-image");

const heroEnteredName = document.getElementById("heroEnteredName");

const heroSentenceName = document.getElementById("heroSentenceName");

const title = document.querySelector(".title");

export const subtitle = document.getElementById("subtitle");

export const heroState = {
    phase: HERO_PHASES.IDLE,
    progress: 0,
    isStoryUnlocked: false,
    isAwaitingAutoScroll: false
};

// Smoothing for the intro story scrub: `heroStoryTargetProgress` is where the
// wheel has asked to be, `heroState.progress` is what is currently rendered.
const heroStorySettings = {
    lerp: 0.14,
    distance: 1120,
    settleDistance: 0.0015
};

let heroStoryTargetProgress = 0;
let heroStoryFrame = null;

const heroTimers = {
    morph: null,
    unlock: null,
    autoScroll: null
};

let hasPlayedFirstTypedAnimation = false;

let isDescriptionRevealComplete = false;

function updateButtonState() {
    if (!nameInput || !enterButton) {
        return;
    }

    enterButton.disabled = isEntered() || nameInput.value.trim() === "";
}

function markDescriptionRevealComplete() {
    isDescriptionRevealComplete = true;

    if (enterForm) {
        enterForm.classList.add("is-visible");
    }
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

function preloadHeroMainImage() {
    if (!hero) {
        return;
    }

    const images = Array.from(heroMainImages);

    if (!images.length) {
        revealHeroMainImage();
        return;
    }

    Promise.all(images.map(function (image) {
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

function setupSubtitleScrambleAnimation() {
    if (!subtitle || subtitle.hasAttribute("data-scramble-ready")) {
        return;
    }

    const subtitleText = defaultSubtitleText;
    subtitle.setAttribute("data-scramble-ready", "true");
    subtitle.setAttribute("aria-label", subtitleText);
    subtitle.textContent = subtitleText;

}

function setupDescriptionScrambleAnimation() {
    const descriptionCopies = document.querySelectorAll(".description-copy");

    descriptionCopies.forEach(function (copy) {
        if (copy.hasAttribute("data-scramble-ready")) {
            return;
        }

        const descriptionText = copy.textContent.trim();
        copy.setAttribute("data-scramble-ready", "true");
        copy.setAttribute("aria-label", descriptionText);
        copy.textContent = descriptionText;
    });
}

function triggerHeroTextScramble() {
    const descriptionCopy = document.querySelector(".description-copy:not([aria-hidden='true'])");

    if (subtitle) {
        scrambleHeroText(subtitle, defaultSubtitleText, {
            duration: 2.2,
            speed: 0.055
        });
    }

    if (descriptionCopy) {
        scrambleHeroText(descriptionCopy, descriptionCopy.getAttribute("aria-label") || descriptionCopy.textContent.trim(), {
            duration: 2.6,
            speed: 0.055
        });
    }
}

function updateSubtitle() {
    if (!nameInput || !subtitle) {
        return;
    }

    if (isEntered()) {
        if (getDisplayName() !== "" && nameInput.value !== getDisplayName()) {
            nameInput.value = getDisplayName();
        }
        return;
    }

    const enteredName = formatDisplayName(nameInput.value).trim();
    const subtitleText = defaultSubtitleText;
    const heroNameText = enteredName === "" ? "Guest" : enteredName;

    if (!hasPlayedFirstTypedAnimation) {
        setupSubtitleScrambleAnimation();
        hasPlayedFirstTypedAnimation = true;
    }

    if (heroEnteredName) {
        heroEnteredName.textContent = heroNameText;
    }

    if (heroSentenceName) {
        heroSentenceName.textContent = heroNameText;
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

    hero.classList.toggle("is-entered", heroState.phase !== HERO_PHASES.IDLE);
    hero.classList.toggle("is-morph-complete", heroState.phase !== HERO_PHASES.IDLE && heroState.phase !== HERO_PHASES.ENTERING);
    hero.classList.toggle("is-story-scrubbing", heroState.phase === HERO_PHASES.SCRUBBING);
    hero.classList.toggle("is-story-complete", heroState.phase === HERO_PHASES.COMPLETE);
    hero.classList.toggle("is-comma-phase", heroState.progress >= 0.94);
}

function setHeroPhase(phase) {
    heroState.phase = phase;
    syncHeroPhaseClasses();
}

function resetHeroFlowState() {
    cancelHeroStoryScrub();
    heroState.progress = 0;
    heroStoryTargetProgress = 0;
    heroState.isStoryUnlocked = false;
    heroState.isAwaitingAutoScroll = false;
    clearHeroMorphTimer();
    clearHeroStoryUnlockTimer();
    clearHeroStoryCompletionTimer();

    if (hero) {
        hero.style.setProperty("--hero-story-progress", "0.0000");
        hero.style.setProperty("--hero-side-pull", "0.0000");
        hero.style.setProperty("--hero-side-scale", "1.0000");
    }

    setHeroPhase(HERO_PHASES.IDLE);
}

export function isHeroScrollLocked() {
    if (isMobileHeroMode()) {
        return false;
    }

    return !!(hero &&
        isEntered() &&
        heroState.phase !== HERO_PHASES.IDLE &&
        window.scrollY <= 6 &&
        (!heroState.isStoryUnlocked || heroState.isAwaitingAutoScroll));
}

function setHeroStoryProgress(progress) {
    if (!hero) {
        return;
    }

    heroState.progress = Math.max(0, Math.min(progress, 1));

    if (isMobileHeroMode()) {
        hero.style.setProperty("--hero-story-progress", "0.0000");
        hero.style.setProperty("--hero-side-pull", "0.0000");
        hero.style.setProperty("--hero-side-scale", "1.0000");
        setHeroPhase(HERO_PHASES.MORPHED);
        clearHeroStoryCompletionTimer();
        return;
    }

    const basePull = heroState.progress;
    const magneticOvershoot = heroState.progress >= 0.64
        ? easeOutBack((heroState.progress - 0.5) / 0.5, 2.8)
        : 0;
    const magneticPull = Math.min(basePull + (magneticOvershoot * 0.36), 1.38);
    const magneticScale = 1 - (Math.min(magneticPull, 1.24) * 0.22);

    hero.style.setProperty("--hero-story-progress", heroState.progress.toFixed(4));
    hero.style.setProperty("--hero-side-pull", magneticPull.toFixed(4));
    hero.style.setProperty("--hero-side-scale", magneticScale.toFixed(4));
    setHeroPhase(heroState.progress >= 1 ? HERO_PHASES.COMPLETE : (heroState.progress > 0 ? HERO_PHASES.SCRUBBING : HERO_PHASES.MORPHED));

    if (heroState.progress < 1) {
        clearHeroStoryCompletionTimer();
    }
}

export function isHeroStoryActive() {
    if (isMobileHeroMode()) {
        return false;
    }

    if (!hero || !isEntered() || heroState.phase === HERO_PHASES.IDLE || heroState.phase === HERO_PHASES.ENTERING || !heroState.isStoryUnlocked) {
        return false;
    }

    return window.scrollY <= 6 && getCurrentSection() && getCurrentSection().id === "home";
}

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

function stepHeroStory() {
    const distance = heroStoryTargetProgress - heroState.progress;

    if (Math.abs(distance) <= heroStorySettings.settleDistance) {
        heroStoryFrame = null;
        setHeroStoryProgress(heroStoryTargetProgress);

        if (heroState.progress >= 1) {
            completeHeroStory();
        }

        return;
    }

    setHeroStoryProgress(heroState.progress + (distance * heroStorySettings.lerp));
    heroStoryFrame = window.requestAnimationFrame(stepHeroStory);
}

function cancelHeroStoryScrub() {
    if (heroStoryFrame) {
        window.cancelAnimationFrame(heroStoryFrame);
        heroStoryFrame = null;
    }

    heroStoryTargetProgress = heroState.progress;
}

// The wheel delivers coarse, uneven steps, so the raw delta only moves a target
// value; the rendered progress eases toward it a frame at a time.
export function scrubHeroStory(delta) {
    if (!isHeroStoryActive()) {
        return false;
    }

    if (reducedMotionQuery.matches) {
        const nextProgress = heroState.progress + (delta / 1120);

        if ((delta > 0 && heroState.progress < 1) || (delta < 0 && heroState.progress > 0)) {
            setHeroStoryProgress(nextProgress);
            heroStoryTargetProgress = heroState.progress;

            if (heroState.progress >= 1) {
                completeHeroStory();
            }

            return true;
        }

        return false;
    }

    // While the eased progress is still catching up to the target the wheel stays
    // captured, otherwise the page would start scrolling underneath an animation
    // that has not finished playing.
    const isSettling = heroStoryFrame !== null;
    const isConsumed = isSettling ||
        (delta > 0 && heroStoryTargetProgress < 1) ||
        (delta < 0 && heroStoryTargetProgress > 0);

    if (!isConsumed) {
        return false;
    }

    heroStoryTargetProgress = Math.max(0, Math.min(heroStoryTargetProgress + (delta / heroStorySettings.distance), 1));

    if (!heroStoryFrame) {
        heroStoryFrame = window.requestAnimationFrame(stepHeroStory);
    }

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

    if (!isDescriptionRevealComplete) {
        return;
    }

    if (heroEnteredName) {
        heroEnteredName.textContent = enteredName;
    }
    if (heroSentenceName) {
        heroSentenceName.textContent = enteredName;
    }
    lockEnterForm(enteredName);
    unlockPage(enteredName);

    if (isMobileHeroMode()) {
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

    setHeroPhase(HERO_PHASES.ENTERING);

    scheduleHeroTimer("morph", 2140, function () {
        setHeroPhase(HERO_PHASES.MORPHED);

        scheduleHeroTimer("unlock", 1100, function () {
            heroState.isStoryUnlocked = true;
        });
    });
}

export function initHero() {
    html.classList.add("is-locked");
    body.classList.add("is-locked");
    setupSubtitleScrambleAnimation();
    setupDescriptionScrambleAnimation();
    preloadHeroMainImage();
    updateButtonState();
    updateSubtitle();
    window.setTimeout(function () {
        if (heroContent) {
            heroContent.classList.add("is-intro-ready");
        }

        triggerHeroTextScramble();
    }, heroIntroDelay);
    window.setTimeout(markDescriptionRevealComplete, descriptionRevealDelay + descriptionRevealDuration + 2000);
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
    setScrollGate({
        isLocked: isHeroScrollLocked,
        isStoryActive: isHeroStoryActive,
        scrub: scrubHeroStory
    });
}
