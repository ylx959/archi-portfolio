import { inertiaScrollSettings, nonDesktopScrollQuery, reducedMotionQuery, scrollDuration } from "./constants.js?v=67";
import { body } from "./dom.js?v=67";
import { isEntered } from "./state.js?v=67";
import { easeInOutCubic } from "./utils.js?v=67";

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

let activeScrollFrame = null;

let inertiaScrollFrame = null;

let inertiaScrollTargetY = 0;

let inertiaScrollCurrentY = 0;

let isInertiaScrollAnimating = false;

let heroTouchStartY = null;

function getMaxPageScroll() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function clampPageScroll(value) {
    return Math.max(0, Math.min(value, getMaxPageScroll()));
}

export function syncInertiaScrollPosition() {
    inertiaScrollCurrentY = window.scrollY;
    inertiaScrollTargetY = window.scrollY;
}

export function cancelInertiaScroll() {
    if (inertiaScrollFrame) {
        window.cancelAnimationFrame(inertiaScrollFrame);
        inertiaScrollFrame = null;
    }

    isInertiaScrollAnimating = false;
    syncInertiaScrollPosition();
}

function isScrollableElement(element) {
    if (!element || element === document.body || element === document.documentElement) {
        return false;
    }

    const styles = window.getComputedStyle(element);
    const overflowY = styles.overflowY;
    const canScrollY = overflowY === "auto" || overflowY === "scroll";

    return canScrollY && element.scrollHeight > element.clientHeight + 1;
}

function hasScrollableAncestor(element) {
    let node = element;

    while (node && node !== document.body && node !== document.documentElement) {
        if (isScrollableElement(node)) {
            return true;
        }

        node = node.parentElement;
    }

    return false;
}

function shouldUseInertiaScroll(event) {
    if (!isEntered() || reducedMotionQuery.matches || nonDesktopScrollQuery.matches) {
        return false;
    }

    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey) {
        return false;
    }

    if (body.classList.contains("is-project-detail-open") || scrollGate.isStoryActive() || scrollGate.isLocked()) {
        return false;
    }

    if (event.target && hasScrollableAncestor(event.target)) {
        return false;
    }

    return true;
}

function shouldBlockBackgroundScroll(event) {
    return body.classList.contains("is-project-detail-open") &&
        !(event.target && hasScrollableAncestor(event.target));
}

function getNormalizedWheelDeltaY(event) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        return event.deltaY * 16;
    }

    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        return event.deltaY * window.innerHeight;
    }

    return event.deltaY;
}

function stepInertiaScroll() {
    const distance = inertiaScrollTargetY - inertiaScrollCurrentY;

    if (Math.abs(distance) <= inertiaScrollSettings.settleDistance) {
        inertiaScrollCurrentY = inertiaScrollTargetY;
        window.scrollTo(0, inertiaScrollCurrentY);
        inertiaScrollFrame = null;
        isInertiaScrollAnimating = false;
        return;
    }

    inertiaScrollCurrentY += distance * inertiaScrollSettings.lerp;
    window.scrollTo(0, inertiaScrollCurrentY);
    inertiaScrollFrame = window.requestAnimationFrame(stepInertiaScroll);
}

function handleInertiaWheel(event) {
    if (!shouldUseInertiaScroll(event)) {
        return false;
    }

    if (activeScrollFrame) {
        window.cancelAnimationFrame(activeScrollFrame);
        activeScrollFrame = null;
        notifyScrollSettled(false);
    }

    if (!isInertiaScrollAnimating) {
        syncInertiaScrollPosition();
    }

    event.preventDefault();
    notifyWheelActivity();
    inertiaScrollTargetY = clampPageScroll(inertiaScrollTargetY + (getNormalizedWheelDeltaY(event) * inertiaScrollSettings.wheelMultiplier));

    if (!inertiaScrollFrame) {
        isInertiaScrollAnimating = true;
        inertiaScrollFrame = window.requestAnimationFrame(stepInertiaScroll);
    }

    return true;
}

function smoothScrollTo(targetY) {
    cancelInertiaScroll();

    const destinationY = clampPageScroll(targetY);
    const startY = window.scrollY;
    const distance = destinationY - startY;
    const startTime = performance.now();

    if (activeScrollFrame) {
        window.cancelAnimationFrame(activeScrollFrame);
    }

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / scrollDuration, 1);
        const easedProgress = easeInOutCubic(progress);
        window.scrollTo(0, startY + (distance * easedProgress));

        if (progress < 1) {
            activeScrollFrame = window.requestAnimationFrame(step);
        } else {
            activeScrollFrame = null;
            syncInertiaScrollPosition();
            notifyScrollSettled(true);
        }
    }

    activeScrollFrame = window.requestAnimationFrame(step);
}

export function smoothScrollToSection(section) {
    if (!section) {
        return;
    }

    const rect = section.getBoundingClientRect();
    const computedStyles = window.getComputedStyle(section);
    const marginTop = parseFloat(computedStyles.marginTop) || 0;
    const overlapOffset = marginTop < 0 ? Math.abs(marginTop) : 0;
    const sectionScrollOffset = parseFloat(computedStyles.getPropertyValue("--section-scroll-offset")) || 0;
    const targetY = window.scrollY + rect.top + overlapOffset + sectionScrollOffset;

    smoothScrollTo(targetY);
}

export function initScroll() {
    window.addEventListener("wheel", function (event) {
        if (scrollGate.isLocked()) {
            event.preventDefault();
            return;
        }

        if (shouldBlockBackgroundScroll(event)) {
            event.preventDefault();
            return;
        }

        if (scrollGate.scrub(event.deltaY)) {
            event.preventDefault();
            return;
        }

        if (handleInertiaWheel(event)) {
            return;
        }

        notifyWheelActivity();
    }, { passive: false });
    window.addEventListener("touchstart", function (event) {
        if (!scrollGate.isStoryActive() || !event.touches.length) {
            heroTouchStartY = null;
            return;
        }

        heroTouchStartY = event.touches[0].clientY;
    }, { passive: true });
    window.addEventListener("touchmove", function (event) {
        if (scrollGate.isLocked()) {
            event.preventDefault();
            return;
        }

        if (shouldBlockBackgroundScroll(event)) {
            event.preventDefault();
            return;
        }

        if (heroTouchStartY === null || !event.touches.length) {
            return;
        }

        const currentY = event.touches[0].clientY;
        const deltaY = heroTouchStartY - currentY;

        if (scrollGate.scrub(deltaY)) {
            event.preventDefault();
            heroTouchStartY = currentY;
        }
    }, { passive: false });
    window.addEventListener("touchend", function () {
        heroTouchStartY = null;
    }, { passive: true });
    window.addEventListener("keydown", function (event) {
        if (event.key === "Home" || event.key === "End" || event.key === "PageUp" || event.key === "PageDown" || event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === " ") {
            cancelInertiaScroll();
        }
    }, { passive: true });
    window.addEventListener("resize", syncInertiaScrollPosition);
}
