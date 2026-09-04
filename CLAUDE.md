# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mandatory File Locking

Before modifying ANY project file, you MUST read and follow

`AGENT_LOCKS.md`.

You MUST acquire a lock before modifying a file.

If another agent owns the required file, DO NOT modify it and DO NOT

busy-wait. Record the dependency as WAITING, continue with other independent

work, and re-check the lock only at a natural synchronization point.

These rules are mandatory even if following them makes the task slower.


## What this is

A single-page portfolio site (YLX studio), built with **Vite** and running on **Lenis** (smooth scroll) and **GSAP + ScrollTrigger** (scroll-linked animation). No test runner. Source lives at the repo root, not in `src/`. Deployed from the `main` branch of `github.com/ylx959/archi-portfolio` by `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages — `dist/` is never committed.

There is no automated test suite, but `scripts/check-data.js` covers the one class of mistake that fails silently on the live site: project data that is well-formed but wrong. Run it after touching the data file or the filters; the deploy workflow runs it too and fails the build on an error.

```
index.html                 markup for every section, and Vite's entry point
vite.config.mjs            base URL, port, dist layout
scripts/main.js            entry point: imports each component and calls its init
scripts/core/              shared across components (see Architecture)
scripts/components/        one file per UI region, each owning its DOM and state
styles/base.css            reset, :root tokens, bare element styles
styles/components/*.css    one stylesheet per component, same names as the JS
public/assets/             images and icons, served verbatim and copied to dist/
scripts/*.js (top level)   Node tooling — CommonJS, never imported by the site
```

## Commands

```bash
npm install                        # first time, and after pulling a lockfile change

npm run dev                        # http://localhost:8000, hot reload
npm run build                      # -> dist/
npm run preview                    # serve the built dist/ to check it before pushing

# After editing mineport-project-data.js or the filter buttons in index.html.
# Exits 1 on an error, 0 on warnings alone.
node scripts/check-data.js

# After adding/changing project images referenced in mineport-project-data.js
node scripts/generate-previews.js            # only creates missing previews
node scripts/generate-previews.js --force    # regenerate all

# Shrink project detail/gallery images over 1MB, in place
node scripts/compress-large-project-images.js
```

The image scripts shell out to macOS `sips`; they will not work on Linux. They are plain CommonJS and read the data file through `vm.runInContext()`, which is why `scripts/mineport-project-data.js` must stay free of `import`/`export` syntax.

`compress-large-project-images.js` caps pixel dimensions **before** compressing to a byte budget (detail 1800px, gallery 2400px). The order matters: an earlier version optimised for file size alone and left 9449px-wide files squeezed under 1MB, which cost more in decode time than the download ever cost in bandwidth. Gallery stage images are also held in `data-src` and only given a real `src` within two slides of the current one — native `loading="lazy"` does not work there, because the track moves by `transform` and a slide's layout box never leaves the viewport.

### URLs, cache busting and the base path

Cache busting for code is Vite's job now: `npm run build` emits `dist/build/index-<hash>.js` and `.css`. There is nothing to stamp by hand, and no `?v=` belongs on an import specifier or a `<link>` — the old `bump-assets.js` is gone.

Images are the exception, because they are served verbatim out of `public/` and never hashed: every image URL in `mineport-project-data.js` carries its own hand-written `?v=N`, including the `cardImage` thumbnails. Changing an image file in place without bumping that number leaves stale copies in browsers — `check-data.js` warns about any image URL missing one.

The site has to work both from `/` and from `/<repo>/` (a GitHub Pages project page), so nothing may hard-code the site root:

- **`index.html` and stylesheets** write `/assets/…`. Vite rewrites that to the configured base at build time, and `VITE_BASE` is what sets it (the deploy workflow passes the repository name; `npm run dev` gets `/`).
- **`mineport-project-data.js`** keeps its own `../assets/…` spelling — it is a browser global script, so it has no `import.meta` to read the base from and Vite cannot rewrite a string it builds at runtime. `core/project-data.js` resolves those to `import.meta.env.BASE_URL + "assets/…"` as it reads the array. Keep writing `../assets/…` there; the resolver, `getPreviewImageSrc()` and `generate-previews.js` all key off that shape.
- **On disk** those same files live under `public/assets/…`. The Node tooling joins against `public/`, the browser never sees it.

## Architecture

### The project data file is the source of truth

`scripts/mineport-project-data.js` publishes two globals:

- `window.MINEPORT_PROJECT_DETAIL_DATA` — the published projects, in grid order. `project-grid.js` renders one `article.project-card` per entry, so **this array alone decides what the site shows**. `.project-grid` in `index.html` is empty.
- `window.MINEPORT_UNPUBLISHED_PROJECT_DATA` — parked entries. Move one into the array above to publish it; nothing else needs editing.

**Adding a project touches one place plus its images**: a `createProjectDetail(...)` entry, and the folders under `public/assets/images/projects/projectN/{card,detail,gallery}/`. Then run `generate-previews.js` and `check-data.js`.

This used to be four places. The cards were hand-written `<article>` markup joined to the data by array index alone (`data.slice(0, projectCards.length)`), the caption text was a third independent copy, and the thumbnail was a `background-image` rule keyed to `.image-grid-NN` — any of which could drift out of step without erroring. If you are tempted to put a `.project-card` back into `index.html`: don't. It would be appended *before* the generated cards and shift every index. `check-data.js` fails on exactly that.

What the entry drives:

- `category` (lowercased) and `year` become the card's `data-category` / `data-year`, which the category and time filters read; `typology` drives the typology filter. Each value needs a matching button in `index.html` — `check-data.js` is what checks the two still agree.
- `title` / `typology` / `year` are the card caption (the year renders `"2024 Summer"` as `"2024, Summer"`).
- `cardImage` is the thumbnail, written as an inline `background-image` on the generated element.

`.image-grid-NN` (NN = 1-based position) survives only as a hook for per-card framing exceptions — currently just project 8, which crops low and drops the dust overlay. A project that needs no exception needs no CSS at all.

Image URLs in the data file are written `../assets/images/...`; `core/project-data.js` rewrites them onto the site's base as it reads the array (see *URLs, cache busting and the base path*). Keep that prefix — `getPreviewImageSrc()` in `core/utils.js` inserts `previews/` after `assets/images/` to find the blurred placeholder, and `generate-previews.js` mirrors the same folder tree.

The data file is loaded by `core/project-data.js` as a **side-effect import**, not by a `<script>` tag: an ES module's imports run before its own body, so the two globals are guaranteed to exist by the line that reads them. It stays a classic script internally — no `import`/`export` — because the Node tooling executes it in a `vm` sandbox with a fake `window`.

Anything written in **CSS or `index.html`** addresses images as `/assets/…` instead, which Vite resolves against the base. Do not use a stylesheet-relative `url(../../assets/…)`: those files no longer sit next to the stylesheets.

### Module layout

`main.js` waits for the DOM, then calls each component's `init*()`. A component file owns its own `getElementById` lookups and its own module-level state; nothing reaches into another component. Style is ES5-flavoured inside the modules (`function (…) {}` callbacks, no arrow functions, double quotes, 4-space indent) — match it.

`core/` holds only what is genuinely shared:

| file | holds |
| --- | --- |
| `constants.js` | timings, `HERO_PHASES`, the `matchMedia` queries |
| `dom.js` | `html` / `body` |
| `utils.js` | text scramble, formatting, `isMobileHeroMode()`, `getPreviewImageSrc()` — easing curves come from gsap, not from here |
| `state.js` | whether the visitor entered, and the name they gave |
| `project-data.js` | `projectDetails` — the whole published array, with image URLs resolved onto the base |
| `animation.js` | the single `gsap.registerPlugin(ScrollTrigger)` call; import `gsap`/`ScrollTrigger` from here, never from the package |
| `sections.js` | the section list, current-section lookup, sticky stack motion |
| `scroll.js` | the Lenis instance, the wheel/touch gate, and `smoothScrollToSection` |

**Three seams keep the graph acyclic — use them instead of adding cross-component imports:**

- `state.js` exposes `isEntered()` / `getDisplayName()` / `markEntered()` rather than bare variables, because an imported binding is read-only and only the hero may write it.
- `scroll.js` owns the wheel and touch listeners but knows nothing about the hero. The hero registers `setScrollGate({ isLocked, isStoryActive, scrub })`; components that want to react to wheel activity or to a settled programmatic scroll register `onWheelActivity()` / `onScrollSettle()`. **`onWheelActivity` is named for the wheel but means "the visitor is scrolling by hand"** — the touch path fires it too. It did not, once, and the floating nav simply never woke on a tablet.
- `unlockPage()` dispatches `portfolio:entered` on `document`. The floating nav listens for it. Anything else gated on entry should listen too, not import from the hero.

Subsystems worth knowing before editing:

- **Enter gate** (`components/hero.js`). `html`/`body` start with `is-locked` (page blurred, scroll disabled) until the name form is submitted. **That class is written into `index.html` itself, and only `unlockPage()` ever removes it** — do not move the `add` back into `initHero()`. It lived there once, which meant the gate did not close until a 200KB module had downloaded and executed: on a cold load the browser had already painted an unlocked, natively scrollable page, and a visitor who scrolled in that window watched the sections and their images arrive one after another with nothing over them. It was invisible on a warm cache, which is why it read as intermittent. The cost of shipping it in the markup is that scripting-off visitors would be frozen on a blank hero, so a `<noscript>` block in `<head>` undoes the lock — the comment above it records why that override needs `!important` and why its selectors have to track `base.css`. Until entry, in-page anchor links are inert. The form itself does not appear with the copy: `completeHeroExpand()` waits on the description scramble and only then calls `revealEnterForm()`, because an input offered while the sentence is still noise pulls the eye to the caret and the copy goes unread. That wait is raced against `enterFormTimeout` — if the scramble ever failed to resolve the form would never appear and the site could not be entered at all.
- **Hero intro choreography** (`components/hero.js`). A promise chain: status lines scramble in and out, the headline drops, the ampersand hops in, and only then does the card fade up under them. The card is last and is not awaited — its fade runs 2.6s in CSS, and waiting it out would hold the wheel dead and the SCROLL hint back for all of it. Each hand-off to another component goes through `dropHeroPart(target[, timeout])`, which dispatches `portfolio:hero-drop` and resolves on the matching `portfolio:hero-dropped` — so a new piece of the intro is a new target, not a new import. Two rules keep that protocol honest, and both were learned by breaking it:

  - **Only answer for targets you own.** `hero-drop.js` used to reply "dropped" for any name it had no body for, which was meant as a safety net for one of *its own* elements going missing. When the ampersand arrived it answered for that too, instantly — the intro stopped waiting while the ampersand was still mid-hop, and the scroll unlocked with it. A component that does not own a target must stay silent.
  - **The fallback runs on gsap's clock**, not `setTimeout`. Everything it waits on animates on the ticker, so a backgrounded tab throttles the animation; a wall-clock timer would carry on and hand the page over early. On the same clock the fallback cannot overtake the thing it insures.
- **Headline drop** (`components/hero-drop.js`). An integrated fall with squash, tilt and sway springs; impact speed drives the squash, so a longer drop lands harder without a second curve to tune. It drops `.hero-expand-word:not(.hero-expand-word-mid)` — **the "&" is deliberately not one of the falling bodies.**
- **The ampersand** (`components/hero-ampersand.js`). Answers the `ampersand` target. It comes in from off the right edge in four hops along the baseline, bends on the spot twice to gather itself, crouches, then clears "Design" on one long hop into the slot between the two words. Hang time is derived, not configured: `getHopDuration()` scales it with the square root of the arc, so every hop obeys one gravity and the long one hangs longer by exactly as much as a jump that height should. The gathering is deliberately vertical only: no lean, no drift. A gsap timeline drives a plain state object; `write()` puts it on the same `--hero-word-drop-*` variables hero-drop.js uses, which is why this needs no CSS of its own — `.hero-expand-word-mid` is the one piece with no expand-travel rule competing for that transform. All of it is squash-and-stretch with volume roughly conserved: it widens exactly when it shortens. Every duration and distance is in the `hop` object at the top; that is the only place to retune it.
- **Waiting for the ampersand** (`components/hero.js`). `isHeroAmpersandLanded` is set only by the ampersand's own report, and `isHeroStoryActive()` requires it. The wheel therefore cannot drive anything — and the SCROLL hint cannot appear — until the "&" is actually in place. It is a fact read directly rather than inferred from how far the promise chain has got, because the chain also resolves on a fallback.
- **Hero story scrub** (`components/hero.js`). A state machine (`HERO_PHASES`, `heroState`) driven by wheel delta while at scroll top — **at every viewport size**. Touch used to skip the whole act and jump to the finished comma; it does not any more, because `core/scroll.js` already feeds touchmove deltas into the same scrub. Only `prefers-reduced-motion` still skips it. The wheel only moves a track's `target`; a gsap tween with `overwrite: true` eases `progress` toward it — a second wheel event retargets the tween in flight rather than stacking another on top — and writes `--hero-story-progress` / `--hero-side-pull` / `--hero-side-scale` on `.hero`. The wheel stays captured for as long as that easing is in flight, so the page cannot scroll out from under an unfinished animation — that is what `isSettling` in `scrubHeroStory` is for.

  `isSettling` is a plain boolean set synchronously in `startHeroTrack`, **not** `tween.isActive()`. gsap reports a tween as inactive until the ticker has rendered it once, so a second wheel event in the same frame saw "nothing is animating", fell through to Lenis, and scrolled the page — after which `isHeroStoryActive()`'s `scrollY <= 6` check failed and the gate stayed open for good. Only fast flicks deliver several events per frame, which is why it looked like an intermittent bug. Do not swap this back for an `isActive()` call.

  Past its own `takeoverProgress` each act finishes itself: the target is snapped to 1 and the tween runs it home, so nobody has to grind out a scrub they have already committed to. The expansion takes over at 0.75, the comma at 0.66 — the latter below `heroStoryReleaseProgress` on purpose, so the rubber-band release still plays as part of the run home. Reaching 1 holds for `heroStoryHandoffDelay` — a beat to read the finished comma, deliberately short because the wheel is dead throughout it — then auto-scrolls to `#projects`.
- **Smooth scroll** (`core/scroll.js`). Lenis, carrying the hand-rolled inertia's tuning across: `wheelMultiplier: 1.12` still comes from `inertiaScrollSettings`, and `lerp` is the same knob the hand-rolled loop had — Lenis's `damp(current, target, lerp * 60, dt)` closes `1 - e^-lerp` of the gap per 60Hz frame, so it *is* "how short is the glide". The original 0.018 coasted for ~2.1s; it is 0.075 now. `smoothWheel` is switched off — leaving native scrolling — for coarse pointers, `max-width: 1024px` and `prefers-reduced-motion`, but the instance stays alive there so `smoothScrollToSection` still animates. `allowNestedScroll` replaces the old `hasScrollableAncestor` walk. `smoothScrollToSection(section, options)` takes an optional `options.duration` (ms): a nav click is a correction the visitor asked for and should feel immediate (`scrollDuration`), while the hero's hand-off into `#projects` is the site taking over and runs slower (`heroHandoffScrollDuration`). They were one constant, and it could not serve both. Three things are worth knowing before editing:
  - **The gate runs in the capture phase on `window`**, ahead of Lenis's own bubble-phase listener. A gesture the hero claims is `preventDefault`ed *and* `stopPropagation`ed, so Lenis never sees it; anything else falls through untouched.
  - **Lenis starts stopped and is started by `portfolio:entered`.** `html.is-locked { overflow: hidden }` is no longer enough on its own to hold the page still, because Lenis moves the page with `window.scrollTo()`, which `overflow` does not stop. While stopped it swallows the wheel outright, which is the lock.
  - **The touch baseline is recorded on every `touchstart`**, not only while the hero story is active. Act two unlocks on a timer, so a finger can go down before the story is live and still be dragging when it becomes live; without a baseline that gesture fell through to native scrolling the instant the lock lifted, and past 6px `isHeroStoryActive()` is false for good — the comma was skipped and the page ran straight to the projects.
  - **`pauseScroll()` / `resumeScroll()`** are what the overlays call. Under them the page cannot scroll, while a scrollable panel inside the overlay still can.
- **One clock** (`core/animation.js` + `core/scroll.js`). `gsap.ticker` drives `lenis.raf()`, and `lenis.on("scroll")` drives `ScrollTrigger.update()`. Everything scroll-linked therefore reads the same position in the same frame Lenis wrote it. Do not add a `requestAnimationFrame` loop or a `scroll` listener for anything scroll-driven — create a ScrollTrigger instead, or it will lag the page by a frame.
- **Filter panels** (`components/project-grid.js`). `createFilterPanel(toggle, panel)` — one implementation, one instance per panel, all of them in `filterPanels`. Opening one closes the others instantly; closing on its own runs the `is-closing` animation. This was two copies of the same sixty lines that differed only in an identifier prefix, which is how the two ended up with subtly different close paths. Add a third panel by calling the factory, not by copying it.
- **Project grid** (`components/project-grid.js`). Builds every card from `projectDetails` in `initProjectGrid()`, so `projectCards` is an exported `let` filled at init rather than a module-load `querySelectorAll`. Thumbnails are CSS backgrounds and fire no `load` event, so each card probes the same URL with `new Image()` (same cache entry, no second download) and wears the blurred `--preview-image` until it settles — on `error` as well as `load`, and skipping the pending state entirely when the probe is already `complete`.
- **Project detail overlay** (`components/project-detail.js`). Opened by card index. Detail images are appended in batches of 5 (`projectImageBatchSize`) as the user scrolls, each starting as a blurred CSS `--preview-image` until the full image fires `load` and the wrapper gets `is-loaded`. A separate "Gallery" mode renders a looping horizontal stage from `detail.galleryImages`.
- **Cursor follower / image magnifier** (`components/cursor-follower.js`). Replaces the native cursor on desktop, samples the hovered image's rendered geometry (`getRenderedImageMetrics`, `object-position` math) to show a zoom lens, and hides itself on touch or reduced motion.
- **Drawings cards** (`components/drawings.js`). The eleven cards are generated from the `drawings` array at the top of that file — image filename, title, place. The `001` index and the `alt` text are positional and derived, so adding a drawing is one line plus the file under `public/assets/images/drawings/`. `.drawings-track` in `index.html` is empty, for the same reason `.project-grid` is.
- **Sticky stacking** (`core/sections.js`, `components/drawings.js`). Sections and drawings cards are `position: sticky` and overlap via `--stack-section-overlap` / `--drawings-card-index`; JS only updates the index and scale variables. Both are driven by a ScrollTrigger `onUpdate`, but neither is a scrubbed tween: a sticky element's start is not a fixed document offset ScrollTrigger could measure once at refresh, so the pass keeps measuring live rects and ScrollTrigger supplies only the tick. `drawings.js` scopes its trigger to the track's own passage through the viewport; `sections.js` spans the page (`start: 0, end: "max"`).
- **Contact dot field** (`components/contact.js`). A `<canvas>` particle grid reacting to pointer position; animated only while the section is visible.
- **Drawings heading** (`components/drawings-title.js`). "THE MOMENTS" is split into per-character spans that float in on an IntersectionObserver, then respond to pointer distance by driving `wght` and `wdth` through `--char-wght` / `--char-wdth`. It needs a width axis, which is why `.drawings-title` alone is set in Roboto Flex rather than Inter. Character boxes are measured once and invalidated by a ScrollTrigger `onUpdate` / `onRefresh`, then re-measured inside the same frame that applies the effect — never per pointer event.

Communication between JS and CSS is almost always via `is-*` class toggles and CSS custom properties rather than inline styles — follow that pattern instead of writing style properties directly.

### Styles

`base.css` holds the reset, the `:root` tokens (colour, project grid geometry, stack overlap, filter panel timings) including their responsive overrides, and bare element styles. Every other rule lives in the `styles/components/*.css` file named after the component that owns it, including that component's own `@media` blocks and `@keyframes`.

Selectors are namespaced by component prefix, so link order in `index.html` does not affect the cascade — but keep `base.css` first. Breakpoints: `1080px` and `768px`, plus `(hover: none), (pointer: coarse)` for touch behaviour and a `prefers-reduced-motion` block. The mobile branches deliberately turn off the hero story and inertia scroll, so test changes at both widths.

**Colour goes through the tokens.** `--paper`, `--ink` and `--shadow` are defined in `base.css`, each alongside a bare `--*-rgb` triple so a translucent variant reuses the same base rather than inventing a fourth spelling of the colour:

```css
color: var(--ink);
background: rgb(var(--ink-rgb) / 0.08);   /* not rgba(23, 21, 20, 0.08) */
```

The ink comes in three tiers, and they are not interchangeable — this was eleven hex literals that looked identical in a swatch but are not:

| token | value | role |
| --- | --- | --- |
| `--ink-strong` | `#11100f` | headlines, active and focused text — 2.4% darker than `--ink`, which is visible |
| `--ink` | `#171514` | body copy, the default |
| `--ink-soft` | `#1f1d1b` | the detail overlay's body copy — 3.1% lighter than `--ink` |
| `--ink-muted` | `#8a867f` | labels, meta, hints |

Judge a fold by **α × Δ**, not by Δ: a shadow at `alpha: 0.08` can be 10 off the base colour and shift the composited pixel by less than 1/255. Anything under 2 is safe to fold onto `--ink`; eight near-black `rgba()` shadows sit above that line (up to α×Δ = 15.5) and were deliberately left as literals.

There were 164 colour literals across the nine stylesheets and no token for any of them, so changing the site's ink meant a search-and-replace across every file. Around 165 are now tokens; what is left is one-off tints that genuinely differ. Reach for a token before adding a hex.

**The hero's side copy is positioned against the card on desktop and against the centre on touch.** `right: calc(50% + (var(--hero-card-width) / 2) + var(--hero-copy-gap))` is fine while the card is a card, but touch sets `--hero-media-width: calc(100% - 24px)`, so that expression resolves past `100%`, the box collapses to a negative width and the copy overflows off screen. Phones escaped it because the `max-width: 768px` block already positions against the centre; tablets — coarse pointer, wider than 768px — fell between the two and needed a block of their own.

**The hero's side copy has a geometry budget on phones.** During the comma scrub the two words converge by `--hero-side-cluster-shift` *plus* `--hero-side-pull-distance`, and the two add up. At `max-width: 768px` they are closing a 44px gap (each copy sits 22px off centre), so their sum must stay under about 20px a side or the words cross. Both were authored when the story never ran at this width, so both were dead values that had never been seen — the pull distance was not even a variable. If the words overlap, that sum is why.

`@keyframes` belongs to the component that plays it. `gallery-arrow-scroll-left` / `-right` were defined in `drawings.css` while only `project-detail.css` used them, which meant a change to the drawings section could silently break the project overlay; they now live with their user.
