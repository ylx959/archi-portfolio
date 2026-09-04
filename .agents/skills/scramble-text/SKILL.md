---
name: scramble-text
description: "Decoder-style text scramble: a line grows out of random noise and resolves character by character, then dissolves back to nothing before the next line grows in. Use whenever the user asks for scrambled/decoding/glitching/matrix text, a text-based loading screen or preloader, animated headline swaps, or describes text that should 'scramble', 'decode', 'shuffle into place', or 'shrink away and come back'. Also use when wiring such an effect to a real asset-loading gate."
---

# Scramble Text

A text transition where each character churns through random glyphs before landing on its real value. Two halves, and **most implementations only build the first one**:

| Half | What it does |
| --- | --- |
| `scrambleIn` | Line grows out of nothing, glyphs resolve one by one |
| `scrambleOut` | Line dissolves back into noise and shortens away to empty |

A line change is `out` **then** `in` — never a swap in place. Swapping in place is the single most common way this effect ends up looking wrong.

`scramble-text.js` in this skill directory is a dependency-free ES module. Copy it in, or reimplement from the rules below.

## The four rules that make it read correctly

**1. It grows in length — it does not appear at full length.**
The first frame is one or two characters, not a full-width block of noise. Each glyph gets an `appearAt` point spread across the first ~55% of the run; the loop `break`s at the first glyph that has not appeared yet.

**2. Every glyph settles at its own time, with jitter.**
A single left-to-right reveal reads as a typewriter, not a decoder. Give each glyph `settleAt = appearAt + 0.14 + random() * 0.4`, so a few land early and the line resolves unevenly.

**3. Spaces and punctuation never scramble.**
`-`, `.`, `,`, `&` and spaces hold their positions for the whole run. This is what lets the reader watch the *sentence* form rather than a wall of noise. Gate on `/[A-Za-z0-9]/`.

**4. The noise alphabet must match the casing of the text.**
Lowercase copy scrambling through capitals looks like a different typeface flickering. Ship three alphabets and pick per line: `SCRAMBLE_LOWER`, `SCRAMBLE_UPPER`, `SCRAMBLE_MIXED`.

## Usage

```js
import { scrambleIn, scrambleOut, scrambleTo, SCRAMBLE_LOWER } from "./scramble-text.js";

await scrambleIn(el, "loading...", { duration: 0.85, characters: SCRAMBLE_LOWER });
await scrambleOut(el, { duration: 0.55, characters: SCRAMBLE_LOWER });
await scrambleTo(el, "Architecture & Design");   // out, then in
```

Every function returns a promise that resolves when the animation is finished, so sequences read as a plain chain.

## Loading screen: gate it on the real asset

The point of a scramble loader is that the wait is real. Do not run it on a fixed timer and hope.

```js
let isReady = false;

Promise.race([
    decodeHeroImage(),          // resolves when the image can actually be painted
    delay(9000)                 // a stalled asset must not trap the visitor
]).then(function () { isReady = true; });

// One full in-and-out per pass, repeating for as long as the download takes.
function pulse() {
    return scrambleIn(el, "loading...", { characters: SCRAMBLE_LOWER })
        .then(function () { return delay(620); })
        .then(function () { return scrambleOut(el, { characters: SCRAMBLE_LOWER }); })
        .then(function () { return isReady ? null : pulse(); });
}

pulse()
    .then(function () { return scrambleIn(el, "thanks for waiting - all set."); })
    .then(function () { return delay(1400); })
    .then(function () { return scrambleOut(el); })
    .then(function () { return scrambleIn(el, "Architecture & Design"); });
```

Four things this gets right:

- **Wait for `decode()`, not `load`.** A loaded image can still stall the first paint while it decodes. `img.decode()` resolves when it is genuinely paintable.
- **Always race a timeout.** A broken or slow asset must not hold the page hostage.
- **Let the cycle finish.** Check `isReady` between passes, not mid-animation — cutting a scramble off half-resolved looks like a bug.
- **Block input for the whole sequence.** If scrolling drives the page, keep that gate shut until the last line lands, or visitors scroll past content that has not arrived.

## Gotchas

**`textContent` flattens markup.** These functions write `textContent`, so any `<span>`, `<strong>` or `<br>` inside the target is destroyed on the first frame. If part of a line needs different styling, split it into sibling leaf elements and scramble each one:

```html
<p class="line">
  <span class="line-name">YLX Studio</span>
  <span class="line-tail">— a collective exploring aesthetics</span>
</p>
```

**Restyling mid-line is visible.** If the status lines and the final headline use different sizes or families, switch the class **while the element is empty**, between `scrambleOut` and `scrambleIn`. Doing it during a scramble makes the line visibly jump.

**Reduced motion.** `prefers-reduced-motion: reduce` should set the text directly and resolve immediately — keep the same promise shape so the sequence still chains.

**One timer per element.** Calling again on a running element must clear the old interval first, or two loops fight over `textContent`. A `WeakMap` keyed by element does this without leaking detached nodes.

**Background tabs clamp timers.** `setInterval` is throttled to ≥1s in a hidden tab, so a scramble looks broken when tested through automation or in a background window. Verify in a foreground tab before concluding the timing is wrong.

**Layout shift.** A growing line changes width every frame. Centre it, or give the container a fixed width, so surrounding content does not jitter.

## Tuning

| Parameter | Default | Effect |
| --- | --- | --- |
| `duration` | 0.9s in / 0.6s out | Total run |
| `speed` | 0.045s | Seconds per noise frame — lower is more frantic |
| `growthWindow` | 0.55 | Fraction of the run spent growing to full length |
| settle jitter | `0.14 + random()*0.4` | Raise the random term for a messier resolve |

Short status lines want ~0.85s; a headline can take 1.2s. Anything past ~1.5s starts to feel slow rather than deliberate.
