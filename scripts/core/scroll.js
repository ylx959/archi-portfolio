import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "./animation.js";
import { inertiaScrollSettings, nonDesktopScrollQuery, reducedMotionQuery, scrollDuration } from "./constants.js";
import { isEntered } from "./state.js";

// gsap's Power2 *is* cubic, so this is the same curve the hand-written
// easeInOutCubic drew — there is no reason to keep a copy of it.
const easeInOutCubic = gsap.parseEase("power2.inOut");

// The hero owns the rules for when the page may scroll at all: while its intro
// story is being scrubbed the wheel drives the story instead of the document.
// It registers those rules here so scroll.js never has to import a component.
const scrollGate = {
    isLocked: function () { return false; },
    isStoryActive: function () { return false; },
    scrub: function () { return false; }
};

const wheelActivityHandlers = [];
const scrollSettleHandlers = [];

export function setScrollGate(gate) {
    Object.assign(scrollGate, gate);
}

// Fired for every wheel event that neither the gate nor a scrollable child consumed.
export function onWheelActivity(handler) {
    wheelActivityHandlers.push(handler);
}

// Fired when a programmatic scroll finishes or is interrupted by the user.
export function onScrollSettle(handler) {
    scrollSettleHandlers.push(handler);
}

function notifyWheelActivity() {
    wheelActivityHandlers.forEach(function (handler) {
        handler();
    });
}

function notifyScrollSettled(completed) {
    scrollSettleHandlers.forEach(function (handler) {
        handler(completed);
    });
}

let lenis = null;

let isProgrammaticScrolling = false;

let heroTouchStartY = null;

// Lenis is the page's scroll engine, but it is only allowed to smooth the wheel
// where the hand-rolled inertia used to run: a coarse pointer, a narrow window
// or a reduced-motion preference all get the browser's own scrolling. Lenis
// stays alive in those cases regardless — smoothScrollToSection still animates
// there, exactly as the old rAF tween did.
function shouldSmoothWheel() {
    return !reducedMotionQuery.matches && !nonDesktopScrollQuery.matches;
}

function syncSmoothWheelMode() {
    if (lenis) {
        lenis.options.smoothWheel = shouldSmoothWheel();
    }
}

export function getLenis() {
    return lenis;
}

// Stop the page scrolling and kill any momentum still in flight — used by the
// overlays, which scroll their own content while the page must stay put.
// Anything the visitor can actually scroll inside the overlay is left alone:
// `allowNestedScroll` lets Lenis hand a wheel event to a scrollable descendant
// that can still move in that direction, and swallow it once that descendant has
// hit its end, so the page never shows through at the bottom of a long panel.
export function pauseScroll() {
    if (lenis) {
        lenis.stop();
    }
}

export function resumeScroll() {
    if (lenis) {
        lenis.resize();
        lenis.start();
    }
}

function abandonProgrammaticScroll() {
    if (!isProgrammaticScrolling) {
        return;
    }

    isProgrammaticScrolling = false;
    notifyScrollSettled(false);
}

function smoothScrollTo(targetY, duration) {
    if (!lenis) {
        window.scrollTo(0, targetY);
        notifyScrollSettled(true);
        return;
    }

    abandonProgrammaticScroll();
    isProgrammaticScrolling = true;
    lenis.scrollTo(targetY, {
        duration: (duration || scrollDuration) / 1000,
        easing: easeInOutCubic,
        // The overlays pause Lenis while they are open; a nav click that closes
        // one and scrolls in the same gesture must not be swallowed by the pause
        // it is on its way out of.
        force: true,
        onComplete: function () {
            isProgrammaticScrolling = false;
            notifyScrollSettled(true);
        }
    });
}

// `options.duration` (ms) overrides the shared pace. The hero's hand-off into
// the work wants a slower, weightier travel than a nav click does — a nav click
// is a correction the visitor asked for and should feel immediate, the hand-off
// is the site taking over.
export function smoothScrollToSection(section, options) {
    if (!section) {
        return;
    }

    const rect = section.getBoundingClientRect();
    const computedStyles = window.getComputedStyle(section);
    const marginTop = parseFloat(computedStyles.marginTop) || 0;
    const overlapOffset = marginTop < 0 ? Math.abs(marginTop) : 0;
    const sectionScrollOffset = parseFloat(computedStyles.getPropertyValue("--section-scroll-offset")) || 0;
    const targetY = window.scrollY + rect.top + overlapOffset + sectionScrollOffset;

    smoothScrollTo(targetY, options && options.duration);
}

// The gate runs in the capture phase on window, which is the only place it can
// sit: Lenis binds its own wheel listener to window in the bubble phase, so
// stopping propagation here is what keeps a gated gesture from also being fed
// into the smoothed scroll.
function handleGateWheel(event) {
    // A pinch-zoom arrives as a ctrl-wheel and a horizontal trackpad swipe as a
    // shift-wheel. Neither is ours; keep Lenis off them so the browser can do
    // its normal thing.
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
        event.stopPropagation();
        return;
    }

    if (scrollGate.isLocked()) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    if (scrollGate.scrub(event.deltaY)) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    // Past this point Lenis (or the browser) gets the event. A wheel while a
    // programmatic scroll is still running means the visitor took the wheel back.
    abandonProgrammaticScroll();
    notifyWheelActivity();
}

// The baseline is recorded for every touch, not only while the story is already
// active. Act two unlocks on a timer, so a finger can go down before the story
// is live and still be dragging when it becomes live. Recording only in the
// active case left that gesture with no baseline: the moment the lock lifted,
// touchmove fell through without preventing anything, the browser scrolled the
// page natively, and past 6px isHeroStoryActive() is false for good — so the
// comma was skipped and the page ran straight on to the projects.
function handleGateTouchStart(event) {
    heroTouchStartY = event.touches.length ? event.touches[0].clientY : null;
}

function handleGateTouchMove(event) {
    if (scrollGate.isLocked()) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }

    if (!event.touches.length) {
        return;
    }

    // A gesture already in progress when the listeners had nothing to record
    // against — adopt it here rather than sitting out the rest of the drag.
    if (heroTouchStartY === null) {
        heroTouchStartY = event.touches[0].clientY;
        return;
    }

    const currentY = event.touches[0].clientY;
    const deltaY = heroTouchStartY - currentY;

    if (scrollGate.scrub(deltaY)) {
        event.preventDefault();
        event.stopPropagation();
        heroTouchStartY = currentY;
        return;
    }

    // Same two calls the wheel path makes once the gate has passed on the
    // gesture: the visitor is driving the scroll, so anything listening for that
    // should hear it, and a drag during a programmatic scroll means they have
    // taken it back. `onWheelActivity` is named for the wheel but means "the
    // visitor is scrolling by hand" — without this the floating nav only ever
    // woke on a mouse, and stayed shut for the whole of a touch session.
    abandonProgrammaticScroll();
    notifyWheelActivity();
}

export function initScroll() {
    lenis = new Lenis({
        // Carried over from the hand-rolled inertia so the page keeps its weight:
        // Lenis eases by `damp(current, target, lerp * 60, dt)`, which at 60fps
        // closes 1 - e^-lerp of the gap per frame — the same 1.8% the old loop
        // moved with `distance * 0.018`.
        lerp: inertiaScrollSettings.lerp,
        wheelMultiplier: inertiaScrollSettings.wheelMultiplier,
        smoothWheel: shouldSmoothWheel(),
        // Touch keeps the browser's own scrolling, as it did before: the phone
        // layout turns the hero story off and never wanted the wheel hijack.
        syncTouch: false,
        // Overlay panels and the gallery scroll inside themselves; this is what
        // replaces the old hasScrollableAncestor() walk.
        allowNestedScroll: true,
        autoRaf: false
    });

    // One clock for the whole site: gsap's ticker advances Lenis, and Lenis's
    // resulting scroll position advances ScrollTrigger.
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
    });

    window.addEventListener("wheel", handleGateWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", handleGateTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", handleGateTouchMove, { passive: false, capture: true });
    window.addEventListener("touchend", function () {
        heroTouchStartY = null;
    }, { passive: true, capture: true });

    // Until the name form is submitted the page must not scroll at all. The
    // `is-locked` class alone is no longer enough to enforce that: it works by
    // putting `overflow: hidden` on html, and Lenis moves the page with
    // window.scrollTo(), which overflow does not stop. So the engine itself
    // starts stopped — while it is, it swallows the wheel outright, and the hero
    // still gets its scrub because the gate above runs ahead of Lenis.
    if (!isEntered()) {
        lenis.stop();
    }

    // Everything measured before this point was measured against a document that
    // could not scroll and was blurred out of layout.
    document.addEventListener("portfolio:entered", function () {
        lenis.resize();
        lenis.start();
        ScrollTrigger.refresh();
    });

    if (typeof reducedMotionQuery.addEventListener === "function") {
        reducedMotionQuery.addEventListener("change", syncSmoothWheelMode);
        nonDesktopScrollQuery.addEventListener("change", syncSmoothWheelMode);
    }
}
