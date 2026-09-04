import { gsap, ScrollTrigger } from "../core/animation.js";
import { getDrawingsStack } from "../core/sections.js";

// "THE MOMENTS / that moved me" is written rather than typed: each line is an
// SVG of the same words in a script face, revealed through a mask whose stroke
// is drawn along the line. A dashoffset on that stroke is what "writing" is
// here — the letters appear in the order a hand would make them, loops and
// crossings included, which a per-character fade cannot do.
//
// The mask stroke is generated from the measured text, not hand-authored: the
// coordinates would otherwise have to be retuned every time the copy, the font
// or the breakpoint changed. It is a gentle wave through the middle of the line,
// thick enough to cover ascenders and descenders.
//
// This replaces the per-character pressure heading, which needed a width axis
// and so needed Roboto Flex; both are gone.

const drawingsTitle = document.querySelector(".drawings-title");
const drawingsTrack = document.getElementById("drawingsTrack");
const drawingsSection = document.querySelector(".drawings-section");

// The text is laid out at this size inside the SVG and then scaled by CSS, so
// one number keeps the geometry (stroke width, wave amplitude) in proportion
// whatever the heading's font-size turns out to be.
const layoutFontSize = 100;

// How much taller than the line the covering stroke is. Below about 1.1 the tops
// of the ascenders survive the mask and the line writes itself with holes in it.
const strokeCoverage = 1.24;

// Sideways overshoot at both ends, so the first letter is not already half
// visible at progress 0 and the last one is fully covered at 1.
const strokeOverhang = 0.12;

const writeDuration = 3.8;

let lines = [];
let totalLength = 0;

function createLineSvg(text, index) {
    const svgNs = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNs, "svg");
    const mask = document.createElementNS(svgNs, "mask");
    const strokePath = document.createElementNS(svgNs, "path");
    const group = document.createElementNS(svgNs, "g");
    const textNode = document.createElementNS(svgNs, "text");
    const maskId = "drawings-signature-mask-" + index;

    svg.setAttribute("class", "drawings-signature-line");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");

    mask.setAttribute("id", maskId);
    // A mask's region defaults to -10%..120% of the masked element's bounding
    // box, and with userSpaceOnUse those percentages resolve against the
    // viewport instead — which lands the window somewhere below the text and
    // slices the letters in half. The region is therefore stated outright in
    // layoutLine, in the same coordinates as the viewBox.

    strokePath.setAttribute("class", "drawings-signature-stroke");
    strokePath.setAttribute("fill", "none");
    strokePath.setAttribute("stroke", "#fff");
    strokePath.setAttribute("stroke-linecap", "round");

    textNode.setAttribute("class", "drawings-signature-text");
    textNode.setAttribute("x", "0");
    textNode.setAttribute("y", "0");
    textNode.setAttribute("font-size", String(layoutFontSize));
    textNode.textContent = text;

    group.setAttribute("mask", "url(#" + maskId + ")");

    mask.appendChild(strokePath);
    group.appendChild(textNode);
    svg.appendChild(mask);
    svg.appendChild(group);

    return { svg: svg, text: textNode, stroke: strokePath, mask: mask };
}

// Called once the font is in: until then the text is measured in the fallback
// face and every box is the wrong width.
function layoutLine(line) {
    const box = line.text.getBBox();
    const pad = box.height * ((strokeCoverage - 1) / 2);
    const left = box.x - (box.width * strokeOverhang);
    const right = box.x + box.width + (box.width * strokeOverhang);
    const middle = box.y + (box.height / 2);
    // A flat sweep would reveal the line like a wipe. The wave is small enough
    // not to be read as a shape of its own and large enough that the reveal
    // rides up and down through the letters the way a hand does.
    const rise = box.height * 0.09;
    const third = (right - left) / 3;

    const viewBox = [box.x - pad, box.y - pad, box.width + (pad * 2), box.height + (pad * 2)];

    line.svg.setAttribute("viewBox", viewBox.join(" "));
    // The mask window is the whole line, generously: anything outside it is
    // hidden no matter what the stroke does.
    line.mask.setAttribute("maskUnits", "userSpaceOnUse");
    line.mask.setAttribute("x", String(viewBox[0] - box.width));
    line.mask.setAttribute("y", String(viewBox[1] - box.height));
    line.mask.setAttribute("width", String(viewBox[2] + (box.width * 2)));
    line.mask.setAttribute("height", String(viewBox[3] + (box.height * 2)));
    // Sized in em so the heading's own font-size drives it, exactly as the text
    // it replaced was driven.
    line.svg.style.width = (viewBox[2] / layoutFontSize) + "em";
    line.svg.style.height = (viewBox[3] / layoutFontSize) + "em";

    line.stroke.setAttribute("stroke-width", String(box.height * strokeCoverage));
    line.stroke.setAttribute("d", [
        "M", left, middle + rise,
        "C", left + third, middle - rise,
        left + (third * 2), middle + rise,
        right, middle - rise
    ].join(" "));

    line.length = line.stroke.getTotalLength();
    line.stroke.style.strokeDasharray = line.length;
}

// One progress value for the whole heading, spent line by line: the second line
// does not start until the first has finished, so the three read as one
// continuous act of writing rather than three things happening at once.
function writeTo(progress) {
    let remaining = Math.max(0, Math.min(progress, 1)) * totalLength;

    lines.forEach(function (line) {
        const drawn = Math.max(0, Math.min(remaining, line.length));
        remaining -= drawn;
        line.stroke.style.strokeDashoffset = line.length - drawn;
    });
}

function writeToScrub(self) {
    writeTo(self.progress);
}

function readLines() {
    const subline = drawingsTitle.querySelector(".drawings-title-subline");
    const sublineText = subline ? subline.textContent.trim() : "";
    // Text nodes are the display lines and <br> is what separates them. Every
    // other node contributes nothing here, the subline element included — it is
    // appended after, so that it is always last.
    const parts = Array.from(drawingsTitle.childNodes)
        .map(function (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                return node.textContent.trim();
            }

            return node.nodeName === "BR" ? "\n" : "";
        })
        .join("")
        .split("\n")
        .map(function (part) {
            return part.trim();
        })
        .filter(Boolean);

    if (sublineText) {
        parts.push(sublineText);
    }

    return parts;
}

function buildSignature() {
    const texts = readLines();

    if (!texts.length) {
        return false;
    }

    // The plain text is what a visitor without this module — or without
    // JavaScript — reads, so the accessible name is taken from it before the
    // markup is replaced.
    drawingsTitle.setAttribute("aria-label", texts.join(" "));
    drawingsTitle.textContent = "";

    lines = texts.map(function (text, index) {
        const line = createLineSvg(text, index);
        // The subline is set apart from the two display lines in CSS, and it is
        // always the last of them.
        if (index === texts.length - 1 && texts.length > 1) {
            line.svg.classList.add("drawings-signature-line-sub");
        }

        drawingsTitle.appendChild(line.svg);
        return line;
    });

    return true;
}

function measure() {
    lines.forEach(layoutLine);
    totalLength = lines.reduce(function (sum, line) {
        return sum + line.length;
    }, 0);
}

export function initDrawingsSignature() {
    if (!drawingsTitle || !buildSignature()) {
        return;
    }

    // Fonts first: a box measured in the fallback face gives a mask stroke that
    // is the wrong length and in the wrong place, and nothing would re-measure
    // it once the real face arrived.
    const ready = document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();

    ready.then(function () {
        measure();
        writeTo(0);

        const media = gsap.matchMedia();

        media.add({
            isDesktop: "(min-width: 769px)",
            reduceMotion: "(prefers-reduced-motion: reduce)"
        }, function (context) {
            const conditions = context.conditions;

            if (conditions.reduceMotion) {
                writeTo(1);
                return;
            }

            if (conditions.isDesktop) {
                // The writing spans the whole approach: it begins as the
                // section's top edge enters from the bottom — the heading is
                // down there with it, blank, and an unwritten signature shows
                // nothing, so there is no reveal to spoil — and the last stroke
                // lands exactly as the first card parks.
                //
                // Those two ends are the point. The nav scrolls #drawings to
                // that same finish line (drawings.js writes the offset), so
                // pressing Drawings flies through the writing and arrives on a
                // finished signature with the first drawing under it. Scrolling
                // in by hand gets the same act at its own pace. Moving either
                // end means moving the nav's landing with it.
                ScrollTrigger.create({
                    trigger: drawingsSection,
                    start: "top bottom",
                    endTrigger: drawingsTrack.querySelector(".drawings-card"),
                    // The first card's own resting position under the sticky
                    // heading — where it stops, not where it appears.
                    end: function () {
                        return "top top+=" + getDrawingsStack(drawingsTrack).top;
                    },
                    scrub: true,
                    onUpdate: writeToScrub,
                    onRefresh: writeToScrub
                });

                return;
            }

            // A phone lays the heading out statically, so it scrolls away
            // instead of holding still: the only scrub distance available is the
            // heading's own height, over which the writing would be a twitch. It
            // plays once instead, at its own pace.
            const played = { value: 0 };
            const tween = gsap.to(played, {
                value: 1,
                duration: writeDuration,
                ease: "none",
                paused: true,
                onUpdate: function () {
                    writeTo(played.value);
                }
            });

            // Fired from the section's top rather than the heading's, for the
            // same reason the desktop scrub is: the heading is barely below the
            // fold when the nav's jump to #drawings starts, so a trigger on it
            // went off mid-flight and the writing was over before the scroll
            // had landed. The section's top reaching the top of the viewport is
            // exactly where that jump ends.
            ScrollTrigger.create({
                trigger: drawingsSection,
                start: "top top",
                once: true,
                onEnter: function () {
                    tween.play();
                }
            });
        });

        // The heading is sized in em off a clamped font-size, so a resize
        // changes the box the stroke has to cover.
        ScrollTrigger.addEventListener("refreshInit", measure);
    });
}
