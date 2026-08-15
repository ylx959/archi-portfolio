export const heroIntroDelay = 2000;

export const descriptionRevealDelay = 2000;

export const descriptionRevealDuration = 4200;

// How long a programmatic scroll takes: the hero's hand-off to #projects, and
// every floating-nav click. It eases in as well as out, so the first fifth of it
// barely moves the page — which is why a long value reads as a pause before the
// scroll rather than as a slow scroll.
export const scrollDuration = 1150;

export const projectImageBatchSize = 5;

export const HERO_PHASES = {
    IDLE: "idle",
    ENTERING: "entering",
    MORPHED: "morphed",
    SCRUBBING: "scrubbing",
    COMPLETE: "complete"
};

export const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

// A narrow desktop window still has a wheel and a fine pointer, so hero
// behaviour keys on capability rather than width.
export const coarsePointerQuery = window.matchMedia("(hover: none), (pointer: coarse)");

export const nonDesktopScrollQuery = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 1024px)");

// Lenis closes `1 - e^-lerp` of the remaining distance every 60Hz frame, so lerp
// is really "how short is the glide": 0.018 (what the hand-rolled inertia used)
// takes ~2.1s to coast to a stop, 0.075 takes ~0.5s. Raise it to shorten the
// glide further, lower it to lengthen it.
export const inertiaScrollSettings = {
    lerp: 0.075,
    wheelMultiplier: 1.12
};

export const heroScrambleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// The status lines are set in lower case, so their noise is too.
export const heroScrambleLowercase = "abcdefghijklmnopqrstuvwxyz0123456789";
