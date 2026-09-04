import { gsap } from "../core/animation.js";
import { HERO_PHASES, coarsePointerQuery, heroScrambleLowercase, reducedMotionQuery } from "../core/constants.js";
import { body, html } from "../core/dom.js";
import { onScrollSettle, setScrollGate, smoothScrollToSection } from "../core/scroll.js";
import { getCurrentSection } from "../core/sections.js";
import { getDisplayName, isEntered, markEntered, setDisplayName } from "../core/state.js";
import { formatDisplayName, isMobileHeroMode, scrambleHeroText, scrambleHeroTextOut } from "../core/utils.js";

export const enterForm = document.getElementById("enterForm");

const nameInput = document.getElementById("name");

export const enterButton = document.getElementById("enterButton");

export const hero = document.querySelector(".hero");

const heroContent = document.querySelector(".content");

const heroVisual = document.getElementById("heroVisual");

const heroMainImages = document.querySelectorAll(".hero-main-image");

const heroEnteredName = document.getElementById("heroEnteredName");

const heroExpandWords = Array.from(document.querySelectorAll(".hero-expand-word"));

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
// `distance` is how much wheel delta one full act costs, `duration` how long the
// render takes to catch up once the wheel stops.
const heroExpandTrack = {
    progress: 0,
    target: 0,
    tween: null,
    isSettling: false,
    // Past this the act finishes itself — see the note on the story track.
    // Later than the comma's: the expansion is the longer, more scenic act and
    // is worth staying in charge of for most of its run.
    takeoverProgress: 0.75,
    // long on purpose: the card keeps easing after the wheel stops, which is the
    // whole point of scrubbing it rather than tracking the wheel one to one
    duration: 0.9,
    distance: 1400
};

const heroStoryTrack = {
    progress: 0,
    target: 0,
    tween: null,
    isSettling: false,
    takeoverProgress: 0.66,
    duration: 0.45,
    distance: 1120
};

// The overshoot the side copy is pulled through. gsap's back.out(n) is the same
// curve the hand-written easeOutBack drew, so it is parsed once here rather than
// kept as a second implementation in utils.js.
const magneticEase = gsap.parseEase("back.out(2.8)");

// Where the squeeze bottoms out: past this the pull is capped, so holding the
// copy any longer just looks stuck. This is the point the rubber band lets go —
// deliberately before the comma has finished forming.
const heroStoryReleaseProgress = 0.82;

// The hand-off travel into #projects. Slower than a nav click on purpose: with
// the hold above at zero this is the whole of the transition, and at the shared
// pace it arrived before the visitor had registered leaving.
const heroHandoffScrollDuration = 1700;

// How long the finished comma is held before the page moves to the work. Zero:
// the comma settling *is* the beat, and anything on top of it reads as the page
// having stalled — the wheel is dead for the whole of it, so there is nothing
// the visitor can do but wait it out.
const heroStoryHandoffDelay = 0;

const heroTimers = {};

// The enter form only becomes usable once the media has finished expanding.
let isHeroExpandComplete = false;

// The card doubles as the loading screen: the wheel is dead until the intro
// sequence has finished announcing itself.
let isHeroIntroComplete = false;

// The ampersand reports when it has finished hopping into place. The wheel gate
// below reads this directly rather than inferring it from where the intro's
// promise chain has got to: the chain also resolves on a fallback timer, and a
// timer that beat the animation would hand the wheel over mid-hop. This cannot —
// it is only ever set by the ampersand actually landing.
let isHeroAmpersandLanded = false;

// Minimum time each intro line stays up. On a warm cache the image is ready
// almost immediately, and a "Loading" that flashes past is worse than none.
const heroIntroTiming = {
    loadingHold: 620,
    // Shorter than the sign-off it leads into: it is a step on the way, and a
    // middle beat that outstays the line it hands to reads as a second stall.
    almostHold: 900,
    thanksHold: 1400,
    // Empty white between the last status line dissolving and the headline
    // arriving. Without it the two read as one continuous swap; with it the
    // intro finishes talking, and then the site begins.
    headlineHold: 1000,
    // a drop reports when it lands; this is only the fallback
    dropTimeout: 2600,
    // .content carries the sentence in over 2.6s; the form waits that out
    descriptionFade: 2800,
    // the hop-in runs ~4.0s; this is only the floor if it never reports
    ampersandTimeout: 5000,
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

    updateButtonState();

    // The form waits for the sentence to arrive. Showing the input while the
    // line is still fading in asks the visitor to read and to type at the same
    // time, and the eye goes to the caret — so the copy is what gets skipped.
    if (reducedMotionQuery.matches) {
        revealEnterForm();
        return;
    }

    delay(heroIntroTiming.descriptionFade).then(revealEnterForm);
}

function revealEnterForm() {
    if (enterForm) {
        enterForm.classList.add("is-visible");
    }

    updateButtonState();
}

// End of act two: the comma has settled, so hand the page over to the work.
function completeHeroStory() {
    const projectsSection = document.getElementById("projects");

    if (!projectsSection) {
        return;
    }

    clearHeroTimer("autoScroll");
    heroState.isAwaitingAutoScroll = true;
    scheduleHeroTimer("autoScroll", 1000, function () {
        smoothScrollToSection(projectsSection, { duration: heroHandoffScrollDuration });
    });
}

function delay(duration) {
    return new Promise(function (resolve) {
        window.setTimeout(resolve, duration);
    });
}

function setHeroTitleWord(element, text, duration, characters) {
    if (!element) {
        return Promise.resolve();
    }

    if (!text) {
        element.textContent = "";
        return Promise.resolve();
    }

    if (reducedMotionQuery.matches) {
        element.textContent = text;
        return Promise.resolve();
    }

    return scrambleHeroText(element, text, {
        duration: duration,
        speed: 0.045,
        characters: characters
    });
}

// Scramble a line in; resolves once it has finished resolving.
function scrambleLineIn(texts, duration, characters) {
    return Promise.all(heroExpandWords.map(function (word, index) {
        return setHeroTitleWord(word, texts[index] || "", duration, characters);
    }));
}

// Dissolve whatever is on screen back to nothing, so the next line arrives from
// empty instead of being swapped in place.
function scrambleLineOut(duration) {
    return Promise.all(heroExpandWords.map(function (word) {
        if (reducedMotionQuery.matches) {
            word.textContent = "";
            return Promise.resolve();
        }

        return scrambleHeroTextOut(word, { duration: duration, speed: 0.04, characters: heroScrambleLowercase });
    }));
}

// The card simply fades up: `.is-card-revealed` switches the opacity and CSS
// runs the 2.6s transition. Nothing waits on it, so this returns nothing.
function revealHeroCard() {
    if (hero) {
        hero.classList.add("is-card-revealed");
    }
}

// Hands a piece of the intro to whichever component owns it and waits for it to
// land. The timeout is a floor, not the schedule: if that component is missing
// the intro still runs.
//
// It is a gsap.delayedCall rather than a setTimeout, and that matters. Every
// piece it waits on animates on gsap's ticker, which is requestAnimationFrame —
// so a backgrounded tab or a stalled machine throttles the animation. A
// wall-clock timeout would carry on regardless and hand the page over while the
// ampersand was still mid-hop, unlocking the scroll before it had landed. On the
// same clock the fallback cannot overtake the thing it is insuring.
function dropHeroPart(target, timeout) {
    return new Promise(function (resolve) {
        let isSettled = false;
        let fallback = null;

        function settle(event) {
            if (isSettled || (event && event.detail && event.detail.target !== target)) {
                return;
            }

            isSettled = true;

            if (fallback) {
                fallback.kill();
            }

            document.removeEventListener("portfolio:hero-dropped", settle);
            resolve();
        }

        document.addEventListener("portfolio:hero-dropped", settle);
        fallback = gsap.delayedCall((timeout || heroIntroTiming.dropTimeout) / 1000, settle);
        document.dispatchEvent(new CustomEvent("portfolio:hero-drop", { detail: { target: target } }));
    });
}

// Loading -> Thanks for waiting -> Architecture & Design, with the line
// dissolving back to nothing between each one. The wheel stays dead throughout,
// so nobody scrolls past a card that has no picture in it yet.
function startHeroIntroSequence() {
    if (!hero) {
        return;
    }

    // Empty the line before unhiding it: the markup ships with the headline in
    // place (it is what the intro ends on), and revealing it as-is would show
    // the ending for a frame before the first status line is scrambled in.
    heroExpandWords.forEach(function (word) {
        word.textContent = "";
    });

    hero.classList.add("is-intro-loading");
    hero.classList.remove("is-intro-pending");

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
        return scrambleLineIn(["loading..."], 0.85, heroScrambleLowercase)
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
            // The download is already finished by the time this runs — the cycle
            // above is what waited for it. This line is pacing, not status: it
            // gives the sequence three steps so it arrives somewhere instead of
            // simply stopping.
            return scrambleLineIn(["almost there..."], 0.95, heroScrambleLowercase);
        })
        .then(function () {
            return delay(heroIntroTiming.almostHold);
        })
        .then(function () {
            return scrambleLineOut(0.55);
        })
        .then(function () {
            return scrambleLineIn(["thanks for waiting - all set."], 1.05, heroScrambleLowercase);
        })
        .then(function () {
            return delay(heroIntroTiming.thanksHold);
        })
        .then(function () {
            return scrambleLineOut(0.6);
        })
        .then(function () {
            return delay(heroIntroTiming.headlineHold);
        })
        .then(function () {
            // The headline is set differently from the status lines, and the
            // switch happens while the line is empty so nothing jumps size. Its
            // three pieces then grow in by weight.
            hero.classList.add("is-intro-headline");
            heroExpandWords[0].textContent = "Architecture";
            // The middle piece is the logo mark. It stays empty and wears
            // `is-mark`, which paints it — the status lines that ran before this
            // point cleared its textContent, and only the class survives that.
            heroExpandWords[1].textContent = "";
            heroExpandWords[1].classList.add("is-mark");
            heroExpandWords[2].textContent = "Design";
            return dropHeroPart("headline");
        })
        .then(function () {
            // Only once the two words are down: the ampersand hops in from off
            // the right edge and over "Design" into the gap they left.
            return dropHeroPart("ampersand", heroIntroTiming.ampersandTimeout);
        })
        .then(function () {
            // The card comes last, not first: the two words fall and the mark
            // hops home against nothing but white, and only once it has landed
            // does the photograph rise under them.
            //
            // Deliberately not awaited. The fade runs 2.6s in CSS, and holding
            // the rest of this behind it would leave the wheel dead and the
            // SCROLL hint absent for that whole stretch. The gate still opens on
            // the ampersand, exactly as it did when the card led.
            revealHeroCard();

            isHeroIntroComplete = true;

            // The hint invites a scroll, so it must not appear while the wheel
            // is still dead. Same condition as the gate, so the two cannot drift.
            if (isHeroAmpersandLanded) {
                hero.classList.remove("is-intro-loading");
            }
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

// Anything with a virtual keyboard, which is not the same question as "is this
// a phone". isMobileHeroMode() is a width test tied to the 768px stylesheet
// breakpoint and is also used by project-detail.js for layout, so it cannot be
// widened — a tablet has a keyboard but desktop-width layout, and was falling
// through this reset entirely: the page stayed where the keyboard had scrolled
// it, leaving a band of white below the hero to scroll straight into.
function hasVirtualKeyboard() {
    return coarsePointerQuery.matches || isMobileHeroMode();
}

function resetMobileHeroViewport() {
    if (!hasVirtualKeyboard()) {
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

// --- The virtual keyboard --------------------------------------------------
// A keyboard shrinks the visual viewport, and `height: 100dvh` follows it down:
// focusing the name field re-laid the whole hero out inside what was left, which
// shoved the photograph, the card and the copy up the screen and dropped them
// back again on blur. So for as long as the keyboard is up the hero's height is
// pinned to the last measurement taken without one — and only then, because a
// permanently pinned height would also stop the hero tracking the URL bar as it
// collapses, which dvh does smoothly and a `resize` listener does in one jump.
//
// `.content` is the one thing still allowed to move, lifted by exactly as much
// as it takes to keep the field itself in sight.

// The gap left between the field and the top of the keyboard.
const heroKeyboardGap = 18;

let isHeroKeyboardOpen = false;

// Reads the visual viewport rather than guessing at a keyboard height: what
// matters is the strip of the layout viewport that is still on screen, and on
// iOS that strip is panned (offsetTop) as well as shortened.
function writeHeroKeyboardLift() {
    if (!hero) {
        return;
    }

    const viewport = window.visualViewport;

    if (!isHeroKeyboardOpen || !viewport || !enterForm) {
        hero.style.setProperty("--hero-keyboard-lift", "0px");
        return;
    }

    // Measured with the lift taken off, so every pass works out the whole
    // distance from the same resting place instead of compounding the last one.
    hero.style.setProperty("--hero-keyboard-lift", "0px");

    const formBottom = enterForm.getBoundingClientRect().bottom;
    const visibleBottom = viewport.offsetTop + viewport.height;
    const lift = Math.max(0, Math.round((formBottom + heroKeyboardGap) - visibleBottom));

    hero.style.setProperty("--hero-keyboard-lift", lift + "px");
}

function openHeroKeyboard() {
    if (!hero || !hasVirtualKeyboard()) {
        return;
    }

    clearHeroTimer("keyboard");

    // The last honest measurement: focus fires before the keyboard has animated
    // in and before the resize it brings with it.
    if (!isHeroKeyboardOpen) {
        hero.style.setProperty("--hero-viewport-height", window.innerHeight + "px");
    }

    isHeroKeyboardOpen = true;
    writeHeroKeyboardLift();
}

function closeHeroKeyboard() {
    if (!hero || !isHeroKeyboardOpen) {
        return;
    }

    isHeroKeyboardOpen = false;
    writeHeroKeyboardLift();

    // The pin is held a beat longer than the blur: the keyboard is still on its
    // way out, so dvh is still the shrunken value for a few frames and handing
    // the height straight back to it would jump the hero exactly the way the pin
    // exists to prevent.
    scheduleHeroTimer("keyboard", 420, function () {
        hero.style.removeProperty("--hero-viewport-height");
    });
}

// Both viewport events land here: a resize is the keyboard arriving or leaving,
// a visual-viewport scroll is iOS panning what is left of the page.
function handleHeroViewportChange() {
    writeHeroKeyboardLift();
}

function clearHeroTimer(timerKey) {
    if (heroTimers[timerKey]) {
        heroTimers[timerKey].kill();
        heroTimers[timerKey] = null;
    }
}

// On gsap's clock rather than setTimeout's, so the whole hero — scrub, drop and
// the waits between them — stops and resumes as one thing when the tab is
// backgrounded, instead of the timers running on while the animation is frozen.
function scheduleHeroTimer(timerKey, delay, callback) {
    clearHeroTimer(timerKey);
    heroTimers[timerKey] = gsap.delayedCall(delay / 1000, function () {
        heroTimers[timerKey] = null;
        callback();
    });
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
    // There was an is-comma-phase toggle here at progress >= 0.94, which swapped
    // the mask from a rounded inset() to the comma polygon(). Two different basic
    // shapes cannot interpolate, so the swap landed in one frame — and because
    // this runs every frame of the scrub, a wheel crossing 0.94 in both
    // directions flipped it back and forth. The mask is one polygon now and the
    // scrub interpolates it, so there is no threshold left to cross.
}

function setHeroPhase(phase) {
    heroState.phase = phase;
    syncHeroPhaseClasses();
}

function resetHeroFlowState() {
    cancelHeroScrub(heroExpandTrack);
    cancelHeroScrub(heroStoryTrack);
    heroState.isAwaitingAutoScroll = false;
    clearHeroTimer("morph");
    clearHeroTimer("unlock");
    clearHeroTimer("autoScroll");
}

// Held still whenever the wheel has nothing left to scrub but the page should
// not move yet: waiting on the name, or waiting on act two to be released.
export function isHeroScrollLocked() {
    if (!hero) {
        return false;
    }

    if (!isEntered()) {
        return !isHeroStoryActive();
    }

    // From the moment the comma settles until the projects section has actually
    // arrived, the wheel does nothing at all. Without the scrollY-free branch the
    // lock lifts as soon as the programmatic scroll starts moving, and a stray
    // wheel event strands the page between two sections.
    if (heroState.isAwaitingAutoScroll) {
        return true;
    }

    return window.scrollY <= 6 && !heroState.isStoryUnlocked;
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
        ? magneticEase((heroStoryTrack.progress - 0.5) / 0.5)
        : 0;
    const magneticPull = Math.min(basePull + (magneticOvershoot * 0.36), 1.38);
    const magneticScale = 1 - (Math.min(magneticPull, 1.24) * 0.22);

    hero.style.setProperty("--hero-story-progress", heroStoryTrack.progress.toFixed(4));
    hero.style.setProperty("--hero-side-pull", magneticPull.toFixed(4));
    hero.style.setProperty("--hero-side-scale", magneticScale.toFixed(4));
    syncHeroPhaseClasses();

    if (heroStoryTrack.progress < 1) {
        clearHeroTimer("autoScroll");
    }
}

// Act one before entering, act two after — whichever is live owns the wheel.
export function isHeroStoryActive() {
    // Touch used to be excluded here. It is not any more — core/scroll.js already
    // feeds touchmove deltas into the same scrub, so the comma runs at every
    // viewport size. Only reduced motion still skips it.
    if (reducedMotionQuery.matches) {
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
        return isHeroIntroComplete && isHeroAmpersandLanded && !isHeroExpandComplete;
    }

    return heroState.isStoryUnlocked;
}

function getActiveHeroTrack() {
    return isEntered() ? heroStoryTrack : heroExpandTrack;
}

// A wheel event retargets the tween already in flight rather than stacking
// another on top of it, which is what `overwrite` buys. gsap also does the
// frame-rate normalisation the hand-rolled loop had to do for itself — without
// it the scrub ran at double speed on a 120Hz display.
function startHeroTrack(track) {
    const isStory = track === heroStoryTrack;
    const write = isStory ? writeStoryProgress : writeExpandProgress;

    // Set synchronously, and read synchronously by scrubHeroStory below. It must
    // not be inferred from the tween — gsap's isActive() is false until the
    // ticker has rendered the tween once, so a second wheel event arriving in the
    // same frame saw "nothing is animating", handed the wheel to Lenis, and the
    // page scrolled out from under the unfinished comma. Once it had scrolled,
    // isHeroStoryActive()'s scrollY check failed and the gate stayed open for
    // good. Fast trackpad flicks deliver several events per frame, which is why
    // it only showed up when scrolling quickly.
    track.isSettling = true;

    track.tween = gsap.to(track, {
        progress: track.target,
        duration: track.duration,
        ease: "power2.out",
        overwrite: true,
        onUpdate: function () {
            write(track.progress);
        },
        onComplete: function () {
            track.isSettling = false;
            write(track.progress);

            if (track.progress >= 1) {
                (isStory ? completeHeroStory : completeHeroExpand)();
            }
        }
    });
}

function cancelHeroScrub(track) {
    if (track.tween) {
        track.tween.kill();
        track.tween = null;
    }

    track.isSettling = false;
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
    const isSettling = track.isSettling === true;
    const isConsumed = isSettling ||
        (delta > 0 && track.target < 1) ||
        (delta < 0 && track.target > 0);

    if (!isConsumed) {
        return false;
    }

    track.target = Math.max(0, Math.min(track.target + (delta / track.distance), 1));

    // Close enough is committed: the wheel has made its intent plain, and asking
    // for the remaining scrub only makes the visitor grind out an animation they
    // have already decided on. Both acts do this, each at its own threshold.
    if (track.target >= track.takeoverProgress) {
        track.target = 1;
    }

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

    // Act two: the copy clears out, "Hello / <name>" arrives, and once it has
    // settled the wheel is handed the comma morph.
    setHeroPhase(HERO_PHASES.ENTERING);

    scheduleHeroTimer("morph", 2140, function () {
        setHeroPhase(HERO_PHASES.MORPHED);

        scheduleHeroTimer("unlock", 1200, function () {
            heroState.isStoryUnlocked = true;
        });
    });
}

// Touch, narrow screens and reduced-motion users never scrub: the media starts
// where the expansion would have ended.
function shouldSkipHeroExpand() {
    return isHeroTouchMode() || reducedMotionQuery.matches;
}

// Touch skips act one entirely, so this must not run before the intro has
// finished: mobile browsers fire `resize` on their own (URL bar collapsing, the
// viewport settling after load, the keyboard), and without the intro guard any
// one of those snaps the hero to its expanded state and shows the enter form
// while the headline is still dropping.
function syncHeroExpandMode() {
    if (isHeroExpandComplete || !isHeroIntroComplete || !shouldSkipHeroExpand()) {
        return;
    }

    completeHeroExpand();
}

export function initHero() {
    document.addEventListener("portfolio:hero-dropped", function (event) {
        if (!event.detail || event.detail.target !== "ampersand") {
            return;
        }

        isHeroAmpersandLanded = true;

        if (isHeroIntroComplete && hero) {
            hero.classList.remove("is-intro-loading");
        }
    });

    // The lock is not added here: `is-locked` ships on <html>/<body> in the
    // markup, so the cover exists at first paint. Adding it from JS meant the
    // gate only closed once this 200KB module had downloaded and run — on a
    // cold load the browser had already painted an unlocked, natively
    // scrollable page, and a visitor who scrolled in that window watched the
    // sections and their images arrive one after another with nothing over
    // them. unlockPage() is still the only thing that takes it off.
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

        nameInput.addEventListener("focus", openHeroKeyboard);
        nameInput.addEventListener("blur", closeHeroKeyboard);

        nameInput.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" || event.isComposing || !hasVirtualKeyboard()) {
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
    window.addEventListener("resize", handleHeroViewportChange);

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", handleHeroViewportChange);
        window.visualViewport.addEventListener("scroll", handleHeroViewportChange);
    }

    setScrollGate({
        isLocked: isHeroScrollLocked,
        isStoryActive: isHeroStoryActive,
        scrub: scrubHeroStory
    });
}
