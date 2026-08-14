export const heroIntroDelay = 2000;

export const descriptionRevealDelay = 2000;

export const descriptionRevealDuration = 4200;

export const scrollDuration = 1600;

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

export const inertiaScrollSettings = {
    lerp: 0.018,
    wheelMultiplier: 1.12,
    settleDistance: 0.2
};

export const heroScrambleCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// The status lines are set in lower case, so their noise is too.
export const heroScrambleLowercase = "abcdefghijklmnopqrstuvwxyz0123456789";
