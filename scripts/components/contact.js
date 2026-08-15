import { reducedMotionQuery } from "../core/constants.js?v=68161bbf";

export const contactSection = document.getElementById("contact");

const contactRippleField = document.getElementById("contactRippleField");

// A ripple travels at RIPPLE_SPEED px/ms until it has crossed the whole section,
// so the wave always reaches every corner no matter where the pointer entered.
const RIPPLE_SPEED = 0.58;
const RIPPLE_BAND = 96;
const RIPPLE_SPAWN_INTERVAL = 240;
const RIPPLE_SPAWN_DISTANCE = 54;
const RIPPLE_MAX_ACTIVE = 6;
const CREST_THRESHOLD = 0.2;

let contactRippleFrame = null;

let isContactFieldVisible = false;

function setupContactRippleField() {
    if (!contactSection || !contactRippleField) {
        return;
    }

    const context = contactRippleField.getContext("2d");

    if (!context) {
        return;
    }

    let dotsX = null;
    let dotsY = null;
    let dotCount = 0;
    // flat [x, y, radius] triples, reused every frame so the draw loop allocates nothing
    let crestBuffer = null;
    let fieldWidth = 1;
    let fieldHeight = 1;
    let travelDistance = 1;
    let ripples = [];
    let lastFrameTime = 0;
    let lastSpawnTime = 0;
    let lastSpawnX = 0;
    let lastSpawnY = 0;

    function isCompactField() {
        return window.innerWidth <= 768;
    }

    function buildContactDots() {
        const rect = contactSection.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(contactSection.offsetHeight));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const spacing = isCompactField() ? 17 : 13;
        const offset = spacing / 2;
        const columns = Math.max(1, Math.ceil((width - offset) / spacing));
        const rows = Math.max(1, Math.ceil((height - offset) / spacing));

        contactRippleField.width = Math.round(width * pixelRatio);
        contactRippleField.height = Math.round(height * pixelRatio);
        contactRippleField.style.width = width + "px";
        contactRippleField.style.height = height + "px";
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        fieldWidth = width;
        fieldHeight = height;
        // the far corner plus one band, so a ripple born in a corner still fades
        // out only after the opposite corner has seen it
        travelDistance = Math.sqrt((width * width) + (height * height)) + RIPPLE_BAND;
        dotCount = columns * rows;
        dotsX = new Float32Array(dotCount);
        dotsY = new Float32Array(dotCount);
        crestBuffer = new Float32Array(dotCount * 3);

        let index = 0;

        for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
                dotsX[index] = offset + (column * spacing);
                dotsY[index] = offset + (row * spacing);
                index += 1;
            }
        }

        drawContactField();
    }

    function spawnRipple(x, y, strength) {
        if (reducedMotionQuery.matches) {
            return;
        }

        if (ripples.length >= RIPPLE_MAX_ACTIVE) {
            ripples.shift();
        }

        ripples.push({
            x: x,
            y: y,
            radius: 0,
            strength: strength
        });

        requestContactFieldAnimation();
    }

    function advanceRipples(delta) {
        const next = [];

        for (let i = 0; i < ripples.length; i += 1) {
            const ripple = ripples[i];

            ripple.radius += RIPPLE_SPEED * delta;

            if (ripple.radius - RIPPLE_BAND < travelDistance) {
                next.push(ripple);
            }
        }

        ripples = next;
    }

    function drawContactField() {
        if (!dotsX) {
            return;
        }

        const compact = isCompactField();
        const baseRadius = compact ? 0.76 : 0.82;
        const swell = compact ? 1.15 : 1.55;
        const push = compact ? 2.2 : 3.4;
        const rippleCount = ripples.length;
        let crestCount = 0;

        context.clearRect(0, 0, fieldWidth, fieldHeight);
        context.fillStyle = "rgba(17, 17, 17, 0.5)";
        context.beginPath();

        for (let i = 0; i < dotCount; i += 1) {
            const originX = dotsX[i];
            const originY = dotsY[i];
            let wave = 0;
            let pushX = 0;
            let pushY = 0;

            for (let r = 0; r < rippleCount; r += 1) {
                const ripple = ripples[r];
                const deltaX = originX - ripple.x;
                const deltaY = originY - ripple.y;
                const distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));
                const offsetFromFront = distance - ripple.radius;

                if (offsetFromFront > RIPPLE_BAND || offsetFromFront < -RIPPLE_BAND) {
                    continue;
                }

                const normalized = offsetFromFront / RIPPLE_BAND;
                const envelope = Math.cos(normalized * Math.PI * 0.5);
                // one crest with a shallow trough on either side — the shape that
                // reads as water rather than as an expanding outline
                const shape = envelope * envelope * Math.cos(normalized * Math.PI * 0.85);
                // fades over the crossing, but only just — the wave has to still be
                // readable when it reaches the far edge of the section
                const decay = Math.pow(Math.max(0, 1 - (ripple.radius / travelDistance)), 1.15);
                const amount = shape * ripple.strength * decay;

                wave += amount;

                if (distance > 0.001) {
                    pushX += (deltaX / distance) * amount;
                    pushY += (deltaY / distance) * amount;
                }
            }

            const radius = Math.max(0.16, baseRadius + (wave * swell));
            const x = originX + (pushX * push);
            const y = originY + (pushY * push);

            if (wave > CREST_THRESHOLD) {
                crestBuffer[crestCount] = x;
                crestBuffer[crestCount + 1] = y;
                crestBuffer[crestCount + 2] = radius;
                crestCount += 3;
                continue;
            }

            context.moveTo(x + radius, y);
            context.arc(x, y, radius, 0, Math.PI * 2);
        }

        context.fill();

        if (crestCount === 0) {
            return;
        }

        // crests are drawn in a second path so the whole wavefront darkens with a
        // single fillStyle change instead of one per dot
        context.fillStyle = "rgba(17, 17, 17, 0.92)";
        context.beginPath();

        for (let i = 0; i < crestCount; i += 3) {
            const x = crestBuffer[i];
            const y = crestBuffer[i + 1];
            const radius = crestBuffer[i + 2];

            context.moveTo(x + radius, y);
            context.arc(x, y, radius, 0, Math.PI * 2);
        }

        context.fill();
    }

    function animateContactField(now) {
        const delta = Math.min(32, now - lastFrameTime);

        lastFrameTime = now;
        advanceRipples(delta);
        drawContactField();

        if (ripples.length > 0 && isContactFieldVisible && !reducedMotionQuery.matches) {
            contactRippleFrame = window.requestAnimationFrame(animateContactField);
        } else {
            contactRippleFrame = null;
        }
    }

    function requestContactFieldAnimation() {
        if (contactRippleFrame || reducedMotionQuery.matches || !isContactFieldVisible) {
            return;
        }

        lastFrameTime = window.performance.now();
        contactRippleFrame = window.requestAnimationFrame(animateContactField);
    }

    function handlePointer(event, force) {
        const rect = contactSection.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const now = window.performance.now();
        const movedX = x - lastSpawnX;
        const movedY = y - lastSpawnY;
        const moved = Math.sqrt((movedX * movedX) + (movedY * movedY));

        if (!force) {
            if (now - lastSpawnTime < RIPPLE_SPAWN_INTERVAL) {
                return;
            }

            if (moved < RIPPLE_SPAWN_DISTANCE) {
                return;
            }
        }

        lastSpawnTime = now;
        lastSpawnX = x;
        lastSpawnY = y;
        spawnRipple(x, y, force ? 1 : 0.72);
    }

    contactSection.addEventListener("pointerenter", function (event) {
        handlePointer(event, true);
    }, { passive: true });

    contactSection.addEventListener("pointermove", function (event) {
        handlePointer(event, false);
    }, { passive: true });

    contactSection.addEventListener("pointerdown", function (event) {
        handlePointer(event, true);
    }, { passive: true });

    if ("IntersectionObserver" in window) {
        const contactObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                isContactFieldVisible = entry.isIntersecting;

                if (isContactFieldVisible) {
                    requestContactFieldAnimation();
                }
            });
        }, { threshold: 0.08 });

        contactObserver.observe(contactSection);
    } else {
        isContactFieldVisible = true;
    }

    buildContactDots();
    window.addEventListener("resize", buildContactDots);
}

export function initContact() {
    setupContactRippleField();
}
