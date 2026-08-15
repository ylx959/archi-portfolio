import { gsap } from "../core/animation.js";
import { reducedMotionQuery } from "../core/constants.js";

// The "&" does not fall in with the rest of the headline. Architecture and
// Design drop from above (hero-drop.js); the ampersand arrives from off the
// right edge of the window in a series of hops along the baseline, crouches to
// gather itself, and clears "Design" on the last one to reach the slot between
// the two words.
//
// It talks to the hero the same way hero-drop.js does — the hero asks for the
// entrance with `portfolio:hero-drop`, this answers `portfolio:hero-dropped`
// once the ampersand has settled — so neither component imports the other.
//
// Nothing here needs new CSS: `.hero-expand-word` already composes
// --hero-word-drop-{x,y,rot,scale-x,scale-y} into one transform, and the middle
// word is the only piece with no expand-travel rule of its own, so those five
// variables are the ampersand's to drive.
//
// The whole thing is squash-and-stretch: the ampersand is treated as a rubbery
// body rather than a glyph being moved around. It stretches along its direction
// of travel as it leaves the ground, passes through neutral at the apex,
// stretches again into the fall, and flattens on impact. Volume is roughly
// conserved — it widens exactly when it shortens — which is what stops the
// deformation reading as a scale bug.

const ampersand = document.querySelector(".hero-expand-word-mid");

const rightWord = document.querySelector(".hero-expand-word-right");

const hop = {
    // how far past the right edge it waits before setting off
    clearance: 90,
    // hops taken in the open space right of "Design", before the big one. The
    // run from off-screen to the launch point is divided evenly between them, so
    // raising this shortens each hop rather than extending the approach.
    approachHops: 4,
    // peak of an approach hop, px
    lowArc: 44,
    // how much higher than the word it is clearing the last hop goes
    clearArc: 30,
    // The hang time of a hop that reaches `lowArc`. Taller hops get longer from
    // getHopDuration() rather than from a second constant — see there.
    hopDuration: 0.32,
    // a ceiling on that, so an unusually tall viewport cannot stretch the last
    // hop into slow motion
    maxHangScale: 1.7,
    // it lands short of "Design" by this much, so the last hop has somewhere to
    // launch from rather than starting on top of the word
    launchGap: 26,
    // flattening on impact. The recovery is elastic, so this is where the squash
    // bottoms out rather than the whole gesture.
    squash: 0.2,
    // how far it draws out along its travel while airborne
    stretch: 0.13,
    // the big hop is thrown harder, so it deforms more
    finalStretch: 0.24,
    // it tips into the direction of travel while airborne
    airborneTilt: 9,
    // time on the ground between hops. Long enough for the impact to register
    // and the squash to read, short enough that the run still bounces rather
    // than becoming a series of separate landings.
    groundBeat: 0.12,
    // --- gathering itself, before the wind-up ---
    // a beat after the last hop lands, so its bounce can settle first
    hesitationDelay: 0.2,
    // Bending on the spot before the big one: it sinks, pushes back up just off
    // the ground, and sinks deeper — purely vertical, no lean and no drift, so
    // it reads as loading up rather than as hesitating about which way to go.
    bobDips: 2,
    bobCompress: 0.12,
    // each dip goes deeper than the last, which is what makes it build
    bobCompressStep: 0.07,
    // how far it unweights off the ground between dips, px
    bobLift: 8,
    bobDipDuration: 0.16,
    bobRiseDuration: 0.18,
    // the beat held at the top of the last rise, before dropping into the crouch
    hesitationHold: 0.06,
    // --- the wind-up before the last hop ---
    // how far it compresses while gathering itself
    crouch: 0.3,
    // leaning back, against the direction of travel
    crouchLean: 6,
    // and drawing back a little, the way anything does before a big jump
    crouchDrawback: 15,
    crouchDuration: 0.26,
    // the beat it holds at the bottom of the crouch before releasing
    crouchHold: 0.12
};

const state = { x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1 };

let entrance = null;

let hasLanded = false;

function write() {
    if (!ampersand) {
        return;
    }

    ampersand.style.setProperty("--hero-word-drop-x", state.x.toFixed(2) + "px");
    ampersand.style.setProperty("--hero-word-drop-y", state.y.toFixed(2) + "px");
    ampersand.style.setProperty("--hero-word-drop-rot", state.rot.toFixed(3) + "deg");
    ampersand.style.setProperty("--hero-word-drop-scale-x", state.scaleX.toFixed(4));
    ampersand.style.setProperty("--hero-word-drop-scale-y", state.scaleY.toFixed(4));
}

function reset(x) {
    state.x = x;
    state.y = 0;
    state.rot = 0;
    state.scaleX = 1;
    state.scaleY = 1;
    write();
}

// Off the right edge, without measuring: this runs before the headline text has
// been written, when the ampersand is still an empty span with no width to read.
function park() {
    reset(window.innerWidth + 200);
}

// Read the resting layout, not wherever the ampersand is parked, so the numbers
// describe where it has to end up rather than where it currently is.
function measure() {
    const parkedX = state.x;

    state.x = 0;
    write();

    const amp = ampersand.getBoundingClientRect();
    const right = rightWord ? rightWord.getBoundingClientRect() : amp;

    state.x = parkedX;
    write();

    return {
        start: (window.innerWidth + hop.clearance) - amp.left,
        // just clear of "Design", which is where the last hop launches from
        launch: Math.max(0, (right.right + hop.launchGap) - amp.left),
        clear: Math.max(amp.height, right.height) + hop.clearArc
    };
}

function report() {
    hasLanded = true;
    document.dispatchEvent(new CustomEvent("portfolio:hero-dropped", { detail: { target: "ampersand" } }));
}

// One gravity for the whole run. Under a fixed gravity hang time goes with the
// square root of the height, so a hop 2.3x taller hangs about 1.5x longer — no
// more, no less. Hard-coding a second duration for the big hop got this wrong in
// both directions: too long and it floated, forced equal to the small hops and
// it snapped across unnaturally fast. Either way it read as staged. Deriving it
// is what makes the last hop feel like the same object jumping harder.
function getHopDuration(peak) {
    return hop.hopDuration * Math.min(hop.maxHangScale, Math.sqrt(peak / hop.lowArc));
}

// One hop: horizontal travel at a constant rate, height as a parabola over the
// same span, a tip into the direction of travel, and squash-and-stretch through
// the whole arc. The horizontal ease is "none" on purpose — easing it too would
// read as the ampersand slowing down in mid-air.
//
// `at` is passed in rather than read from timeline.duration(), because the
// squash recovery runs well past the landing and the next hop has to launch
// *into* it. Sequencing on the timeline's end instead left the ampersand
// standing still between hops, which reads as stepping rather than bouncing.
// `overwrite: "auto"` on the launch is what lets that recovery be interrupted.
function addHop(timeline, at, toX, duration, peak, tilt, stretch, recover) {
    const half = duration / 2;
    // The stretch is spent early — a body leaves the ground already extended and
    // is back to its own shape by the top of the arc.
    const rise = Math.min(0.12, half * 0.5);

    timeline.to(state, { x: toX, duration: duration, ease: "none" }, at);
    timeline.to(state, { y: -peak, duration: half, ease: "power2.out" }, at);
    timeline.to(state, { y: 0, duration: half, ease: "power2.in" }, at + half);
    timeline.to(state, { rot: -tilt, duration: half, ease: "sine.out" }, at);
    timeline.to(state, { rot: 0, duration: half, ease: "sine.in" }, at + half);

    timeline.to(state, {
        scaleY: 1 + stretch,
        scaleX: 1 - (stretch * 0.55),
        duration: rise,
        ease: "power2.out",
        overwrite: "auto"
    }, at);
    timeline.to(state, { scaleY: 1, scaleX: 1, duration: half - rise, ease: "sine.inOut" }, at + rise);
    // Falling: it draws out again as it picks up speed.
    timeline.to(state, {
        scaleY: 1 + (stretch * 0.75),
        scaleX: 1 - (stretch * 0.42),
        duration: half,
        ease: "power2.in"
    }, at + half);

    timeline.to(state, {
        scaleY: 1 - hop.squash,
        scaleX: 1 + (hop.squash * 0.55),
        duration: 0.07,
        ease: "power2.out"
    }, at + duration);
    // Skipped when a crouch follows: the wind-up starts before this recovery
    // would, so leaving it in means it fires *after* the crouch has begun and
    // pulls the compression straight back out. Landing squashed and then
    // compressing further into the crouch is the truer motion anyway.
    if (recover !== false) {
        timeline.to(state, {
            scaleY: 1,
            scaleX: 1,
            duration: 0.34,
            ease: "elastic.out(1, 0.42)"
        }, at + duration + 0.07);
    }
}

// Gathering itself. Two bends on the spot before the jump, each deeper than the
// last, flowing straight into the crouch below — so the sequence is dip, rise,
// deeper dip, rise, and then all the way down. It is deliberately vertical only:
// an earlier version edged forward and rocked back, which read as dithering
// about the jump rather than winding up for it.
function addHesitation(timeline, at) {
    let cursor = at;

    for (let index = 0; index < hop.bobDips; index += 1) {
        const compress = hop.bobCompress + (index * hop.bobCompressStep);

        timeline.to(state, {
            y: 0,
            rot: 0,
            scaleY: 1 - compress,
            scaleX: 1 + (compress * 0.6),
            duration: hop.bobDipDuration,
            ease: "power2.out",
            overwrite: "auto"
        }, cursor);
        cursor += hop.bobDipDuration;

        // Pushing back up: it stretches and comes just off the ground, which is
        // what makes the next dip read as a bigger effort than the last.
        timeline.to(state, {
            y: -hop.bobLift,
            scaleY: 1 + (compress * 0.5),
            scaleX: 1 - (compress * 0.28),
            duration: hop.bobRiseDuration,
            ease: "power2.inOut"
        }, cursor);
        cursor += hop.bobRiseDuration;
    }

    return cursor + hop.hesitationHold;
}

// The wind-up. It compresses, leans back and draws back along the ground, then
// holds there — the pause is the point, because it is what makes the hop that
// follows read as effort rather than as another bounce.
function addCrouch(timeline, at) {
    timeline.to(state, {
        scaleY: 1 - hop.crouch,
        scaleX: 1 + (hop.crouch * 0.62),
        rot: hop.crouchLean,
        x: "+=" + hop.crouchDrawback,
        y: 0,
        duration: hop.crouchDuration,
        ease: "power3.out",
        overwrite: "auto"
    }, at);

    return at + hop.crouchDuration + hop.crouchHold;
}

function run() {
    if (!ampersand || hasLanded) {
        return;
    }

    if (reducedMotionQuery.matches) {
        reset(0);
        report();
        return;
    }

    if (entrance) {
        entrance.kill();
    }

    const geo = measure();

    reset(geo.start);

    entrance = gsap.timeline({
        onUpdate: write,
        onComplete: function () {
            reset(0);
            report();
        }
    });

    // The approach: even hops down the empty space to the right of "Design".
    let at = 0;

    for (let index = 1; index <= hop.approachHops; index += 1) {
        const toX = geo.start + ((geo.launch - geo.start) * (index / hop.approachHops));
        addHop(entrance, at, toX, getHopDuration(hop.lowArc), hop.lowArc, hop.airborneTilt, hop.stretch, true);
        at += getHopDuration(hop.lowArc) + hop.groundBeat;
    }

    at = addHesitation(entrance, at + hop.hesitationDelay);
    at = addCrouch(entrance, at);

    // The last one clears "Design" and drops into the slot.
    addHop(entrance, at, 0, getHopDuration(geo.clear), geo.clear, hop.airborneTilt * 1.6, hop.finalStretch, true);
}

export function initHeroAmpersand() {
    if (!ampersand) {
        return;
    }

    park();

    // A resize before its cue would otherwise leave it parked inside the frame.
    window.addEventListener("resize", function () {
        if (!hasLanded && !entrance) {
            park();
        }
    });

    document.addEventListener("portfolio:hero-drop", function (event) {
        if (event.detail && event.detail.target === "ampersand") {
            run();
        }
    });
}
