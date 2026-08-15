import { reducedMotionQuery } from "../core/constants.js?v=68161bbf";

// Things in the hero intro arrive by falling into frame and bouncing to a stop.
// This is an integrated fall rather than a keyframe with a bouncy easing curve:
// impact speed is what drives the squash, so a longer drop lands harder without
// anyone tuning a second curve to match.
//
// It talks to the hero through events rather than imports — the hero asks for a
// drop, this answers when that thing has settled.

const hero = document.querySelector(".hero");

const physics = {
    // px/s². High for the frame size: real g at this scale reads as floating.
    gravity: 5200,
    // fraction of impact speed that survives a bounce
    restitution: 0.42,
    // below this it is done bouncing and gets parked
    settleSpeed: 95,
    // how far clear of the frame edge it starts
    clearance: 70,
    // seconds for a squash to recover
    squashRecovery: 0.15,
    // Nothing lands perfectly level. Tilt is a damped spring back to upright,
    // kicked on every impact, so the piece rocks itself flat instead of just
    // pumping up and down.
    tiltStiffness: 170,
    tiltDamping: 0.72,
    tiltImpactKick: 0.05,
    // a ceiling, not the shape: the springs settle well inside this
    tiltMax: 12,
    // a lateral rock on the same spring, in px
    swayStiffness: 140,
    swayDamping: 0.8,
    swayImpactKick: 0.05,
    swayMax: 14,
    // it is only done when it has stopped rocking, not just stopped bouncing
    restTilt: 0.12,
    restTiltSpeed: 7
};

// Each thing that can fall: where its variables go, and how much it deforms.
// The three headline pieces are separate bodies — one rigid line dropping as a
// slab looks like a panel, three pieces landing a beat apart looks like objects.
const words = Array.from(document.querySelectorAll(".hero-expand-word"));

const droppers = {
    card: {
        element: document.getElementById("heroVisual"),
        prefix: "--hero-card-drop",
        maxSquash: 0.16,
        spread: 0.55,
        gravityScale: 1,
        // a heavy panel barely tips
        tiltScale: 0.45,
        leanSeed: -1,
        revealClass: "is-card-revealed",
        droppingClass: "is-card-dropping"
    }
};

words.forEach(function (element, index) {
    droppers["word" + index] = {
        element: element,
        prefix: "--hero-word-drop",
        // Text has less apparent mass than the card, so it deforms less —
        // squashing type as hard as a panel reads as a bug.
        maxSquash: 0.1,
        spread: 0.4,
        // Slightly different weights so they do not bounce in lockstep, and
        // alternating lean so they do not all tip the same way.
        gravityScale: 1 + ((index - 1) * 0.09),
        tiltScale: 1 + ((index % 2) * 0.35),
        leanSeed: index % 2 === 0 ? 1 : -1
    };
});

// Dropping the headline means dropping its pieces, staggered, and reporting once
// the last one has stopped moving.
const WORD_STAGGER = 95;

function write(dropper) {
    const element = dropper.element;

    if (!element) {
        return;
    }

    element.style.setProperty(dropper.prefix + "-y", dropper.y.toFixed(2) + "px");
    // Spread sideways as it compresses vertically, so it keeps its area and the
    // impact reads as weight rather than a scale-down.
    element.style.setProperty(dropper.prefix + "-scale-x", (1 + (dropper.squash * dropper.spread)).toFixed(4));
    element.style.setProperty(dropper.prefix + "-scale-y", (1 - dropper.squash).toFixed(4));
    element.style.setProperty(dropper.prefix + "-rot", dropper.tilt.toFixed(3) + "deg");
    element.style.setProperty(dropper.prefix + "-x", dropper.sway.toFixed(2) + "px");
}

function finish(name, dropper) {
    dropper.y = 0;
    dropper.velocity = 0;
    dropper.squash = 0;
    dropper.tilt = 0;
    dropper.tiltVelocity = 0;
    dropper.sway = 0;
    dropper.swayVelocity = 0;
    dropper.frame = null;
    write(dropper);

    if (hero && dropper.droppingClass) {
        hero.classList.remove(dropper.droppingClass);
    }

    document.dispatchEvent(new CustomEvent("portfolio:hero-dropped", { detail: { target: name } }));
}

function step(name, dropper, now) {
    // Clamped so a stalled frame cannot teleport it through the floor.
    const elapsed = dropper.lastFrame ? Math.min(48, now - dropper.lastFrame) : 16.667;
    const delta = elapsed / 1000;

    dropper.lastFrame = now;
    dropper.velocity += (physics.gravity * dropper.gravityScale) * delta;
    dropper.y += dropper.velocity * delta;

    if (dropper.y >= 0) {
        dropper.y = 0;

        if (Math.abs(dropper.velocity) < physics.settleSpeed) {
            // Done bouncing, but not necessarily done moving: the tilt spring
            // outlasts the fall, and cutting it here would chop the rock off.
            dropper.velocity = 0;

            if (Math.abs(dropper.tilt) < physics.restTilt &&
                Math.abs(dropper.tiltVelocity) < physics.restTiltSpeed &&
                Math.abs(dropper.sway) < physics.restTilt * 8) {
                finish(name, dropper);
                return;
            }
        } else {
            // Impact: how hard it hit decides how much it squashes, and how hard
            // it is knocked off level. The lean flips each bounce so it rocks.
            const impact = Math.abs(dropper.velocity);

            dropper.squash = Math.min(dropper.maxSquash, impact / 18000);
            dropper.tiltVelocity += impact * physics.tiltImpactKick * dropper.lean * dropper.tiltScale;
            dropper.swayVelocity += impact * physics.swayImpactKick * dropper.lean * dropper.tiltScale;
            dropper.lean = -dropper.lean;
            dropper.velocity = -dropper.velocity * physics.restitution;
        }
    }

    // Tilt and sway are springs back to level, so the piece settles upright on
    // its own rather than needing the fall to end at exactly the right angle.
    dropper.tiltVelocity += (-dropper.tilt * physics.tiltStiffness) * delta;
    dropper.tiltVelocity *= Math.pow(0.02, delta / physics.tiltDamping);
    dropper.tilt += dropper.tiltVelocity * delta;
    dropper.tilt = Math.max(-physics.tiltMax, Math.min(physics.tiltMax, dropper.tilt));

    dropper.swayVelocity += (-dropper.sway * physics.swayStiffness) * delta;
    dropper.swayVelocity *= Math.pow(0.02, delta / physics.swayDamping);
    dropper.sway += dropper.swayVelocity * delta;
    dropper.sway = Math.max(-physics.swayMax, Math.min(physics.swayMax, dropper.sway));

    // Exponential recovery, framerate independent.
    dropper.squash *= Math.pow(0.02, delta / physics.squashRecovery);

    write(dropper);
    dropper.frame = window.requestAnimationFrame(function (nextNow) {
        step(name, dropper, nextNow);
    });
}

function dropHeadline() {
    const names = words.map(function (element, index) {
        return "word" + index;
    });

    if (!names.length) {
        document.dispatchEvent(new CustomEvent("portfolio:hero-dropped", { detail: { target: "headline" } }));
        return;
    }

    let remaining = names.length;

    function onePieceLanded(event) {
        if (names.indexOf(event.detail.target) === -1) {
            return;
        }

        remaining -= 1;

        if (remaining > 0) {
            return;
        }

        document.removeEventListener("portfolio:hero-dropped", onePieceLanded);
        document.dispatchEvent(new CustomEvent("portfolio:hero-dropped", { detail: { target: "headline" } }));
    }

    document.addEventListener("portfolio:hero-dropped", onePieceLanded);

    // Park them all now, in this frame: a piece waiting its turn must not be
    // visible at its resting place while the one before it is still falling.
    names.forEach(function (name) {
        park(droppers[name]);
    });

    names.forEach(function (name, index) {
        window.setTimeout(function () {
            drop(name);
        }, index * WORD_STAGGER);
    });
}

// Lift a body clear of the top of the frame, whatever size it happens to be.
function park(dropper) {
    if (!dropper || !dropper.element) {
        return;
    }

    const height = dropper.element.getBoundingClientRect().height || (window.innerHeight * 0.3);

    dropper.y = -((window.innerHeight / 2) + (height / 2) + physics.clearance);
    dropper.velocity = 0;
    dropper.squash = 0;
    dropper.lastFrame = 0;
    // Already off level on the way down — a piece that falls perfectly upright
    // and only then tips looks mechanical.
    dropper.lean = dropper.leanSeed;
    dropper.tilt = dropper.leanSeed * 4.5 * dropper.tiltScale;
    dropper.tiltVelocity = dropper.leanSeed * -34 * dropper.tiltScale;
    dropper.sway = 0;
    dropper.swayVelocity = 0;
    write(dropper);
}

function drop(name) {
    if (name === "headline") {
        dropHeadline();
        return;
    }

    const dropper = droppers[name];

    if (!dropper || !dropper.element) {
        document.dispatchEvent(new CustomEvent("portfolio:hero-dropped", { detail: { target: name } }));
        return;
    }

    if (hero && dropper.revealClass) {
        hero.classList.add(dropper.revealClass);
    }

    if (reducedMotionQuery.matches) {
        finish(name, dropper);
        return;
    }

    if (dropper.frame) {
        window.cancelAnimationFrame(dropper.frame);
        dropper.frame = null;
    }

    park(dropper);

    if (hero && dropper.droppingClass) {
        hero.classList.add(dropper.droppingClass);
    }

    write(dropper);

    dropper.frame = window.requestAnimationFrame(function (now) {
        step(name, dropper, now);
    });
}

export function initHeroDrop() {
    Object.keys(droppers).forEach(function (name) {
        const dropper = droppers[name];

        dropper.y = 0;
        dropper.velocity = 0;
        dropper.squash = 0;
        dropper.tilt = 0;
        dropper.tiltVelocity = 0;
        dropper.sway = 0;
        dropper.swayVelocity = 0;
        dropper.lean = dropper.leanSeed;
        dropper.frame = null;
        dropper.lastFrame = 0;
        write(dropper);
    });

    document.addEventListener("portfolio:hero-drop", function (event) {
        drop(event.detail && event.detail.target ? event.detail.target : "card");
    });
}
