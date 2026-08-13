import { reducedMotionQuery } from "../core/constants.js?v=9";

export const contactSection = document.getElementById("contact");

const contactDotField = document.getElementById("contactDotField");

let contactDotFrame = null;

let isContactDotVisible = false;

let contactDots = [];

const contactDotPointer = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    isActive: false
};

function setupContactDotField() {
    if (!contactSection || !contactDotField) {
        return;
    }

    const context = contactDotField.getContext("2d");

    if (!context) {
        return;
    }

    function buildContactDots() {
        const rect = contactSection.getBoundingClientRect();
        const width = Math.max(1, Math.round(rect.width));
        const height = Math.max(1, Math.round(contactSection.offsetHeight));
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const spacing = window.innerWidth <= 768 ? 10 : 8;
        const offset = spacing / 2;

        contactDotField.width = Math.round(width * pixelRatio);
        contactDotField.height = Math.round(height * pixelRatio);
        contactDotField.style.width = width + "px";
        contactDotField.style.height = height + "px";
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        contactDots = [];

        for (let y = offset; y < height; y += spacing) {
            for (let x = offset; x < width; x += spacing) {
                contactDots.push({
                    x: x,
                    y: y
                });
            }
        }

        contactDotPointer.x = width * 0.68;
        contactDotPointer.y = height * 0.46;
        contactDotPointer.targetX = contactDotPointer.x;
        contactDotPointer.targetY = contactDotPointer.y;
        contactDotPointer.isActive = false;
        drawContactDots();
    }

    function drawContactDots() {
        const width = contactDotField.width / Math.min(window.devicePixelRatio || 1, 2);
        const height = contactDotField.height / Math.min(window.devicePixelRatio || 1, 2);
        const influenceX = window.innerWidth <= 768 ? 170 : 320;
        const influenceY = window.innerWidth <= 768 ? 130 : 230;
        const baseRadius = window.innerWidth <= 768 ? 0.76 : 0.82;
        const maxRadius = window.innerWidth <= 768 ? 1.0 : 1.45;

        context.clearRect(0, 0, width, height);
        context.fillStyle = "#111111";

        contactDots.forEach(function (dot) {
            let radius = baseRadius;

            if (contactDotPointer.isActive) {
                const normalizedX = (dot.x - contactDotPointer.x) / influenceX;
                const normalizedY = (dot.y - contactDotPointer.y) / influenceY;
                const distance = Math.sqrt((normalizedX * normalizedX) + (normalizedY * normalizedY));
                const falloff = Math.max(0, 1 - distance);
                const easedFalloff = Math.pow(falloff, 1.55);
                radius += easedFalloff * maxRadius;
            }

            context.beginPath();
            context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
            context.fill();
        });
    }

    function animateContactDots() {
        const ease = contactDotPointer.isActive ? 0.16 : 0.055;

        contactDotPointer.x += (contactDotPointer.targetX - contactDotPointer.x) * ease;
        contactDotPointer.y += (contactDotPointer.targetY - contactDotPointer.y) * ease;
        drawContactDots();

        if (isContactDotVisible && !reducedMotionQuery.matches) {
            contactDotFrame = window.requestAnimationFrame(animateContactDots);
        } else {
            contactDotFrame = null;
        }
    }

    function requestContactDotAnimation() {
        if (contactDotFrame || reducedMotionQuery.matches) {
            drawContactDots();
            return;
        }

        contactDotFrame = window.requestAnimationFrame(animateContactDots);
    }

    contactSection.addEventListener("pointermove", function (event) {
        const rect = contactSection.getBoundingClientRect();

        contactDotPointer.targetX = event.clientX - rect.left;
        contactDotPointer.targetY = event.clientY - rect.top;
        contactDotPointer.isActive = true;
        requestContactDotAnimation();
    }, { passive: true });

    contactSection.addEventListener("pointerleave", function () {
        contactDotPointer.isActive = false;
        drawContactDots();
    });

    if ("IntersectionObserver" in window) {
        const contactObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                isContactDotVisible = entry.isIntersecting;

                if (isContactDotVisible) {
                    requestContactDotAnimation();
                }
            });
        }, { threshold: 0.08 });

        contactObserver.observe(contactSection);
    } else {
        isContactDotVisible = true;
    }

    buildContactDots();
    window.addEventListener("resize", buildContactDots);
}

export function initContact() {
    setupContactDotField();
}
