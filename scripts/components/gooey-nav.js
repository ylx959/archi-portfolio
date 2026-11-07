import { gsap } from "../core/animation.js";
import { reducedMotionQuery } from "../core/constants.js";

// The active pill of the section nav, ported from React Bits' GooeyNav. Moving to
// another link does not slide the pill: it bursts into drops that fly to the new
// link and pool there, drawn as one signed-distance field on a WebGL canvas so
// the drops and pills merge like liquid. A second copy of the labels in the
// active ink sits on top, clipped to the same shape, so a label turns dark
// exactly where the liquid covers it.
//
// This module owns the shape only. Which link is active is floating-nav.js's
// business; it calls go().

const maxDrops = 32;
const maxPills = 4;
// How far the canvas extends past the stage: drops fly out over the frame.
const canvasMargin = 72;

// The component's defaults, less its drop shadow: the pill sits flat on the glass.
// The hover pill is stronger than its 0.08, which vanishes on glass this light.
const settings = {
    animationTime: 600,
    particleCount: 15,
    timeVariance: 300,
    spread: 56,
    gooeyness: 0.5,
    wobble: 0.5,
    hoverAlpha: 0.24
};

const vertexSource = `#version 300 es
in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const fragmentSource = `#version 300 es
precision highp float;

uniform vec2 uSize;
uniform float uRatio;
uniform vec4 uPills[${maxPills}];
uniform vec4 uHover;
uniform vec4 uDrops[${maxDrops}];
uniform vec2 uTails[${maxDrops}];
uniform int uCount;
uniform float uSmooth;
uniform vec3 uPill;
uniform vec4 uHoverColor;

out vec4 outColor;

float sdPill(vec2 p, vec4 box) {
    vec2 extent = max(box.zw, vec2(0.0));
    float r = min(extent.x, extent.y);
    vec2 q = abs(p - box.xy) - extent + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float blend(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float field(vec2 p) {
    float shape = 1e5;
    for (int i = 0; i < ${maxPills}; i++) {
        vec4 pill = uPills[i];
        if (pill.z <= 0.0) continue;
        shape = blend(shape, sdPill(p, pill), uSmooth);
    }
    for (int i = 0; i < ${maxDrops}; i++) {
        if (i >= uCount) break;
        vec4 drop = uDrops[i];
        if (drop.z <= 0.0) continue;
        float d = sdCapsule(p, drop.xy, drop.xy - uTails[i], drop.z);
        if (d > shape + uSmooth) continue;
        shape = blend(shape, d, uSmooth);
    }
    return shape;
}

void main() {
    vec2 p = vec2(gl_FragCoord.x, uSize.y * uRatio - gl_FragCoord.y) / uRatio;
    float d = field(p);
    float aa = max(fwidth(d), 0.35);
    float body = clamp(0.5 - d / aa, 0.0, 1.0);

    vec2 grad = vec2(dFdx(d), -dFdy(d));
    vec2 n = length(grad) > 0.0001 ? normalize(grad) : vec2(0.0, 1.0);
    float rim = (1.0 - smoothstep(0.0, 1.6, -d)) * max(0.0, -n.y) * 0.3;
    vec3 fill = mix(uPill, vec3(1.0), rim);

    float hover = clamp(0.5 - sdPill(p, uHover) / aa, 0.0, 1.0) * uHoverColor.a;

    vec4 color = vec4(uHoverColor.rgb * hover, hover);
    color = vec4(fill * body, body) + color * (1.0 - body);
    outColor = color;
}
`;

const uniformNames = ["uSize", "uRatio", "uPills", "uHover", "uDrops", "uTails", "uCount", "uSmooth", "uPill", "uHoverColor"];

function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}

function travelEase(t) {
    const x = clamp01(t);
    return x < 0.5 ? 4 * x * x * x : 1 - (Math.pow((-2 * x) + 2, 3) / 2);
}

function bezier(a, b, c, d, t) {
    const u = 1 - t;
    return (u * u * u * a) + (3 * u * u * t * b) + (3 * u * t * t * c) + (t * t * t * d);
}

function getPillPath(x, y, w, h) {
    if (w <= 0.5 || h <= 0.5) {
        return "";
    }

    const r = Math.min(w, h) / 2;
    return "M" + (x + r) + "," + y + "H" + (x + w - r) + "A" + r + "," + r + " 0 0 1 " + (x + w) + "," + (y + r) + "V" + (y + h - r) + "A" + r + "," + r + " 0 0 1 " + (x + w - r) + "," + (y + h) + "H" + (x + r) + "A" + r + "," + r + " 0 0 1 " + x + "," + (y + h - r) + "V" + (y + r) + "A" + r + "," + r + " 0 0 1 " + (x + r) + "," + y + "Z";
}

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function buildPipeline(gl) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program);
        return null;
    }

    const uniforms = {};
    uniformNames.forEach(function (name) {
        uniforms[name] = gl.getUniformLocation(program, name);
    });

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    return { program: program, uniforms: uniforms, buffer: buffer, position: gl.getAttribLocation(program, "aPosition") };
}

// The pill takes the page's paper, read off the token rather than restated.
function readPillColor() {
    const triple = window.getComputedStyle(document.documentElement).getPropertyValue("--paper-rgb").trim().split(/\s+/);

    return triple.map(function (channel) {
        return (parseFloat(channel) || 255) / 255;
    });
}

// `stage` holds the nav's <ul>. The canvas, the no-WebGL fallback and the active
// copy of the labels are built here, because nothing but this module reads them.
export function createGooeyNav(stage, list) {
    const canvas = document.createElement("canvas");
    canvas.className = "gooey-nav-canvas";
    canvas.setAttribute("aria-hidden", "true");

    const fallback = document.createElement("span");
    fallback.className = "gooey-nav-fallback";
    fallback.setAttribute("aria-hidden", "true");

    const overlay = document.createElement("ul");
    overlay.className = "gooey-nav-list gooey-nav-list-active";
    overlay.setAttribute("aria-hidden", "true");

    Array.from(list.children).forEach(function (item) {
        const copy = document.createElement("li");
        const label = document.createElement("span");
        copy.className = "gooey-nav-item";
        label.className = "gooey-nav-label";
        label.textContent = item.textContent.trim();
        copy.appendChild(label);
        overlay.appendChild(copy);
    });

    stage.insertBefore(fallback, list);
    stage.insertBefore(canvas, fallback);
    stage.appendChild(overlay);

    const isReduced = reducedMotionQuery.matches;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    const pipeline = gl ? buildPipeline(gl) : null;
    const pillColor = readPillColor();

    stage.classList.toggle("has-gooey-canvas", !!pipeline);

    const view = { width: 0, height: 0 };
    const pills = new Map();
    const drops = [];
    const hover = { x: 0, y: 0, w: 0, h: 0, alpha: 0, index: -1 };
    const pillData = new Float32Array(maxPills * 4);
    const dropData = new Float32Array(maxDrops * 4);
    const tailData = new Float32Array(maxDrops * 2);
    let rects = [];
    let target = -1;
    let isTicking = false;
    let last = 0;

    function measure() {
        const box = stage.getBoundingClientRect();
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const outerWidth = box.width + (canvasMargin * 2);
        const outerHeight = box.height + (canvasMargin * 2);
        const width = Math.max(1, Math.round(outerWidth * ratio));
        const height = Math.max(1, Math.round(outerHeight * ratio));

        view.width = box.width;
        view.height = box.height;
        canvas.style.setProperty("--gooey-canvas-margin", -canvasMargin + "px");
        canvas.style.setProperty("--gooey-canvas-width", outerWidth + "px");
        canvas.style.setProperty("--gooey-canvas-height", outerHeight + "px");

        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
        }

        rects = Array.from(list.children).map(function (item) {
            const rect = item.getBoundingClientRect();
            return { x: rect.left - box.left, y: rect.top - box.top, w: rect.width, h: rect.height };
        });
    }

    // The same field as the shader, walked row by row on the CPU, because the
    // label overlay is clipped by CSS and CSS cannot read the canvas.
    function trace(boxes, blobs, smooth) {
        function field(x, y) {
            let d = 1e5;

            function merge(value) {
                const h = clamp01(0.5 + ((0.5 * (value - d)) / smooth));
                d = value + ((d - value) * h) - (smooth * h * (1 - h));
            }

            boxes.forEach(function (box) {
                const r = Math.min(box.hw, box.hh);
                const qx = Math.abs(x - box.cx) - box.hw + r;
                const qy = Math.abs(y - box.cy) - box.hh + r;
                merge(Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r);
            });

            blobs.forEach(function (blob) {
                const px = x - blob.x;
                const py = y - blob.y;
                const bx = -blob.tx;
                const by = -blob.ty;
                const span = (bx * bx) + (by * by);
                const h = span > 0.0001 ? clamp01(((px * bx) + (py * by)) / span) : 0;
                const value = Math.hypot(px - (bx * h), py - (by * h)) - blob.r;

                if (value <= d + smooth) {
                    merge(value);
                }
            });

            return d;
        }

        const step = 2;
        const parts = [];

        for (let y = 0; y < view.height; y += 1) {
            const cy = y + 0.5;
            let previous = field(0, cy);
            let start = previous < 0 ? 0 : null;

            for (let x = step; x <= view.width + step; x += step) {
                const value = field(Math.min(x, view.width), cy);

                if ((previous < 0) !== (value < 0)) {
                    const cross = x - step + ((step * previous) / (previous - value));

                    if (value < 0) {
                        start = cross;
                    } else if (start !== null) {
                        parts.push("M" + start.toFixed(1) + "," + y + "H" + cross.toFixed(1) + "V" + (y + 1) + "H" + start.toFixed(1) + "Z");
                        start = null;
                    }
                }

                previous = value;
            }

            if (start !== null) {
                parts.push("M" + start.toFixed(1) + "," + y + "H" + view.width + "V" + (y + 1) + "H" + start.toFixed(1) + "Z");
            }
        }

        return parts.join("");
    }

    function getPill(index) {
        if (!pills.has(index)) {
            pills.set(index, { mass: 0, scale: 0, velocity: 0, outgoing: 0 });
        }

        return pills.get(index);
    }

    function getShape(index, amount) {
        const rect = rects[index];

        if (!rect || amount <= 0.002) {
            return null;
        }

        const h = rect.h * Math.min(1.08, 0.42 + (0.58 * Math.sqrt(Math.max(0, amount))));
        const w = Math.max(h, rect.w * Math.pow(Math.max(0, amount), 0.75));

        return { x: rect.x + (rect.w / 2) - (w / 2), y: rect.y + (rect.h / 2) - (h / 2), w: w, h: h };
    }

    function planDrop(drop, index, now, isFresh) {
        const rect = rects[index];

        if (!rect) {
            return;
        }

        const reach = settings.spread;
        const ex = rect.x + (rect.w / 2) + ((Math.random() - 0.5) * rect.w * 0.45);
        const ey = rect.y + (rect.h / 2) + ((Math.random() - 0.5) * rect.h * 0.2);
        const base = settings.animationTime / 1000;
        const variance = (Math.random() - 0.5) * (settings.timeVariance / 1000);
        const duration = Math.max(0.15, (base * (0.62 + (Math.random() * 0.32))) + (variance * 0.6));
        const out = Math.random() * Math.PI * 2;
        const into = Math.random() * Math.PI * 2;
        const burst = reach * (0.7 + (Math.random() * 0.6));
        const swing = reach * (0.55 + (Math.random() * 0.55));
        const carry = Math.min(duration / 3, 0.12);

        drop.index = index;
        drop.start = now;
        drop.duration = duration;
        drop.path = [
            drop.x,
            drop.y,
            isFresh ? drop.x + (Math.cos(out) * burst * 1.6) : drop.x + (drop.vx * carry),
            isFresh ? drop.y + (Math.sin(out) * burst * 1.6) : drop.y + (drop.vy * carry),
            ex + (Math.cos(into) * swing * 1.5),
            ey + (Math.sin(into) * swing * 1.5),
            ex,
            ey
        ];
    }

    function emitDrops(from, to, now) {
        const source = pills.get(from);
        const rect = rects[from];

        if (!source || !rect || !rects[to]) {
            return;
        }

        const available = source.mass - source.outgoing;

        if (available <= 0.002) {
            return;
        }

        const room = maxDrops - drops.length;
        const count = Math.min(room, Math.max(1, Math.round(settings.particleCount * available)));
        const leaveWindow = (settings.animationTime / 1000) * 0.16;

        for (let i = 0; i < count; i += 1) {
            const mass = available / count;
            source.outgoing += mass;
            drops.push({
                x: rect.x + (rect.w / 2) + ((Math.random() - 0.5) * rect.w * 0.6),
                y: rect.y + (rect.h / 2) + ((Math.random() - 0.5) * rect.h * 0.3),
                vx: 0,
                vy: 0,
                mass: mass,
                size: 0.8 + (Math.random() * 0.4),
                given: 0,
                source: from,
                index: to,
                leave: now + (Math.random() * leaveWindow * 1000),
                emerged: 0,
                absorbed: 0,
                state: "waiting"
            });
        }
    }

    function render() {
        const height = rects[target] ? rects[target].h : (rects[0] ? rects[0].h : 36);
        const smooth = height * (0.18 + (0.5 * settings.gooeyness));
        const boxes = [];
        const blobs = [];

        pills.forEach(function (state, index) {
            const box = getShape(index, state.scale);

            if (box) {
                boxes.push({ cx: box.x + (box.w / 2), cy: box.y + (box.h / 2), hw: box.w / 2, hh: box.h / 2 });
            }
        });

        drops.forEach(function (drop) {
            if (drop.state === "waiting") {
                return;
            }

            const radius = 0.26 * height * drop.size * Math.min(drop.emerged, 1 - drop.absorbed);

            if (radius <= 0.05) {
                return;
            }

            const speed = Math.hypot(drop.vx, drop.vy);
            const length = Math.min(radius * 1.1, speed * 0.018);

            blobs.push({
                x: drop.x,
                y: drop.y,
                r: radius,
                tx: speed > 0.01 ? (drop.vx / speed) * length : 0,
                ty: speed > 0.01 ? (drop.vy / speed) * length : 0
            });
        });

        if (boxes.length === 1 && !blobs.length) {
            const box = boxes[0];
            overlay.style.clipPath = "path('" + getPillPath(box.cx - box.hw, box.cy - box.hh, box.hw * 2, box.hh * 2) + "')";
        } else {
            overlay.style.clipPath = "path('" + (trace(boxes, blobs, smooth) || "M0,0Z") + "')";
        }

        overlay.classList.add("is-ready");

        if (!pipeline) {
            const resting = getShape(target, 1);

            if (resting) {
                fallback.style.setProperty("--gooey-fallback-x", resting.x.toFixed(2) + "px");
                fallback.style.setProperty("--gooey-fallback-y", resting.y.toFixed(2) + "px");
                fallback.style.setProperty("--gooey-fallback-width", resting.w + "px");
                fallback.style.setProperty("--gooey-fallback-height", resting.h + "px");
            }

            return;
        }

        let slot = 0;
        boxes.slice(0, maxPills).forEach(function (box) {
            pillData[slot * 4] = box.cx + canvasMargin;
            pillData[(slot * 4) + 1] = box.cy + canvasMargin;
            pillData[(slot * 4) + 2] = box.hw;
            pillData[(slot * 4) + 3] = box.hh;
            slot += 1;
        });
        pillData.fill(0, slot * 4);

        const count = Math.min(blobs.length, maxDrops);
        blobs.slice(0, maxDrops).forEach(function (blob, index) {
            dropData[index * 4] = blob.x + canvasMargin;
            dropData[(index * 4) + 1] = blob.y + canvasMargin;
            dropData[(index * 4) + 2] = blob.r;
            dropData[(index * 4) + 3] = 0;
            tailData[index * 2] = blob.tx;
            tailData[(index * 2) + 1] = blob.ty;
        });

        const uniforms = pipeline.uniforms;
        const outerWidth = view.width + (canvasMargin * 2);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(pipeline.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, pipeline.buffer);
        gl.enableVertexAttribArray(pipeline.position);
        gl.vertexAttribPointer(pipeline.position, 2, gl.FLOAT, false, 0, 0);
        gl.uniform2f(uniforms.uSize, outerWidth, view.height + (canvasMargin * 2));
        gl.uniform1f(uniforms.uRatio, canvas.width / Math.max(1, outerWidth));
        gl.uniform4fv(uniforms.uPills, pillData);
        gl.uniform4f(uniforms.uHover, hover.x + canvasMargin, hover.y + canvasMargin, hover.w / 2, hover.h / 2);
        gl.uniform4fv(uniforms.uDrops, dropData);
        gl.uniform2fv(uniforms.uTails, tailData);
        gl.uniform1i(uniforms.uCount, count);
        gl.uniform1f(uniforms.uSmooth, smooth);
        gl.uniform3f(uniforms.uPill, pillColor[0], pillColor[1], pillColor[2]);
        gl.uniform4f(uniforms.uHoverColor, 1, 1, 1, settings.hoverAlpha * hover.alpha);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function advanceDrops(now, dt) {
        const emergeTime = 0.09;
        const absorbTime = 0.12;

        for (let i = drops.length - 1; i >= 0; i -= 1) {
            const drop = drops[i];

            if (drop.state === "waiting") {
                if (now < drop.leave) {
                    continue;
                }

                drop.state = "flying";
                planDrop(drop, drop.index, now, true);
            }

            if (drop.state === "flying") {
                drop.emerged = Math.min(1, drop.emerged + (dt / emergeTime));

                const source = pills.get(drop.source);

                if (source && drop.given < drop.mass) {
                    const given = Math.min(drop.mass * (dt / emergeTime), drop.mass - drop.given);
                    source.mass = Math.max(0, source.mass - given);
                    source.outgoing = Math.max(0, source.outgoing - given);
                    drop.given += given;
                }

                const t = clamp01((now - drop.start) / 1000 / drop.duration);
                const eased = travelEase(t);
                const path = drop.path;
                const x = bezier(path[0], path[2], path[4], path[6], eased);
                const y = bezier(path[1], path[3], path[5], path[7], eased);

                if (dt > 0) {
                    drop.vx = (x - drop.x) / dt;
                    drop.vy = (y - drop.y) / dt;
                }

                drop.x = x;
                drop.y = y;

                if (t >= 1) {
                    drop.state = "absorbing";
                }
            }

            if (drop.state === "absorbing") {
                const absorbed = Math.min(1 - drop.absorbed, dt / absorbTime);
                const host = getPill(drop.index);

                drop.absorbed += absorbed;
                drop.vx *= 0.8;
                drop.vy *= 0.8;
                host.mass = Math.min(1, host.mass + (drop.mass * absorbed));

                if (drop.absorbed >= 1) {
                    drops.splice(i, 1);
                }
            }
        }
    }

    function advancePills(dt) {
        const zeta = isReduced ? 1 : 1 - (0.72 * clamp01(settings.wobble));
        const omega = 26;
        const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
        const h = dt / steps;

        pills.forEach(function (state, index) {
            for (let n = 0; n < steps; n += 1) {
                state.velocity += ((omega * omega * (state.mass - state.scale)) - (2 * zeta * omega * state.velocity)) * h;
                state.scale += state.velocity * h;
            }

            if (index !== target && state.mass <= 0.002 && state.outgoing <= 0.002 && Math.abs(state.scale) < 0.004) {
                pills.delete(index);
            }
        });
    }

    function stopTicking() {
        isTicking = false;
        gsap.ticker.remove(frame);
    }

    function frame() {
        const now = window.performance.now();
        const dt = Math.min(0.05, ((now - last) / 1000) || 0);
        last = now;

        advanceDrops(now, dt);
        advancePills(dt);

        if (hover.index >= 0 && rects[hover.index]) {
            const rect = rects[hover.index];
            const k = 1 - Math.exp(-dt / 0.06);
            hover.x += ((rect.x + (rect.w / 2)) - hover.x) * k;
            hover.y += ((rect.y + (rect.h / 2)) - hover.y) * k;
            hover.w += (rect.w - hover.w) * k;
            hover.h += (rect.h - hover.h) * k;
        }

        const hoverGoal = hover.index >= 0 && hover.index !== target ? 1 : 0;
        hover.alpha += (hoverGoal - hover.alpha) * (1 - Math.exp(-dt / 0.08));

        render();

        const host = pills.get(target);
        const isResting = drops.length === 0 && pills.size === 1 && host
            && Math.abs(host.mass - host.scale) < 0.0008
            && Math.abs(host.velocity) < 0.004;
        const hoverRect = rects[hover.index];
        const isHovering = Math.abs(hoverGoal - hover.alpha) > 0.003
            || (hoverRect && Math.abs((hoverRect.x + (hoverRect.w / 2)) - hover.x) + Math.abs(hoverRect.w - hover.w) > 0.1);

        if (isResting && !isHovering) {
            host.mass = 1;
            host.scale = 1;
            host.velocity = 0;
            hover.alpha = hoverGoal;
            render();
            stopTicking();
        }
    }

    function wake() {
        if (isTicking) {
            return;
        }

        isTicking = true;
        last = window.performance.now();
        gsap.ticker.add(frame);
    }

    function settle(index) {
        pills.clear();
        drops.length = 0;
        target = index;

        const state = getPill(index);
        state.mass = 1;
        state.scale = 1;
        state.velocity = 0;
        render();
    }

    function go(index) {
        if (index === target) {
            return;
        }

        if (!rects[index] || isReduced || target < 0 || !pipeline) {
            settle(index);
            return;
        }

        const now = window.performance.now();
        target = index;
        getPill(index);

        drops.forEach(function (drop) {
            drop.index = index;

            if (drop.state === "flying") {
                planDrop(drop, index, now, false);
            }

            if (drop.state === "absorbing") {
                drop.state = "flying";
                drop.mass *= 1 - drop.absorbed;
                drop.absorbed = 0;
                planDrop(drop, index, now, false);
            }
        });

        Array.from(pills.keys()).forEach(function (from) {
            if (from !== index) {
                emitDrops(from, index, now);
            }
        });

        wake();
    }

    list.addEventListener("pointerover", function (event) {
        const item = event.target.closest("[data-gooey-index]");

        if (!item || !list.contains(item)) {
            return;
        }

        const index = Number(item.dataset.gooeyIndex);
        const rect = rects[index];

        if (!rect) {
            return;
        }

        if (hover.alpha < 0.01) {
            hover.x = rect.x + (rect.w / 2);
            hover.y = rect.y + (rect.h / 2);
            hover.w = rect.w;
            hover.h = rect.h;
        }

        hover.index = index;
        wake();
    });

    list.addEventListener("pointerleave", function () {
        hover.index = -1;
        wake();
    });

    function refresh() {
        measure();

        if (target < 0) {
            return;
        }

        if (drops.length) {
            render();
        } else {
            settle(target);
        }
    }

    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(stage);
    resizeObserver.observe(list);

    measure();

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(refresh);
    }

    return { go: go };
}
