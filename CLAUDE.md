# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page static portfolio site (YLX studio). No build step, no package.json, no dependencies, no tests — but the JavaScript is ES modules, so it must be served over HTTP (see Commands). Deployed from the `main` branch of `github.com/ylx959/portfolio-website`.

```
index.html                 markup for every section
scripts/main.js            entry point: imports each component and calls its init
scripts/core/              shared across components (see Architecture)
scripts/components/        one file per UI region, each owning its DOM and state
styles/base.css            reset, :root tokens, bare element styles
styles/components/*.css    one stylesheet per component, same names as the JS
vendor/                    vendored libraries (Lenis, GSAP) — not wired up yet
```

## Commands

```bash
# Preview locally. Required — opening index.html via file:// fails, because
# the browser blocks ES module imports on that scheme.
python3 -m http.server 8000        # then open http://localhost:8000

# After ANY edit to a stylesheet or module — bumps ?v=N in index.html AND on
# every import specifier, since index.html's version does not reach the modules
# it imports and browsers cache each module URL separately.
node scripts/bump-assets.js

# After adding/changing project images referenced in mineport-project-data.js
node scripts/generate-previews.js            # only creates missing previews
node scripts/generate-previews.js --force    # regenerate all

# Shrink project detail/gallery images over 1MB, in place
node scripts/compress-large-project-images.js
```

The image scripts shell out to macOS `sips`; they will not work on Linux.

`compress-large-project-images.js` caps pixel dimensions **before** compressing to a byte budget (detail 1800px, gallery 2400px). The order matters: an earlier version optimised for file size alone and left 9449px-wide files squeezed under 1MB, which cost more in decode time than the download ever cost in bandwidth. Gallery stage images are also held in `data-src` and only given a real `src` within two slides of the current one — native `loading="lazy"` does not work there, because the track moves by `transform` and a slide's layout box never leaves the viewport.

Cache busting is manual and matters: `index.html` links CSS/JS with `?v=N`, and every image URL in `mineport-project-data.js` carries its own hand-written `?v=N`. Changing an image file in place without bumping its query string leaves stale copies in browsers.

## Architecture

### Project data ↔ markup coupling (the main gotcha)

Project cards are **static markup** in `index.html` (`.project-grid > article.project-card`), while their detail content lives in `scripts/mineport-project-data.js` as `window.MINEPORT_PROJECT_DETAIL_DATA`. They are joined **by array index only**:

- `projectDetails = data.slice(0, projectCards.length)` — extra data entries are silently ignored, so a new card in the HTML is required before a new data entry is visible.
- Card `data-category` and `data-year` drive the category/time filters; `detail.typology` (from the data file) drives the typology filter. Both must agree with the visible caption text, which is a third, independent copy in the HTML.
- The card thumbnail is a CSS background: `.image-grid-01`…`.image-grid-09` in `styles/components/project-grid.css`.

Adding a project therefore touches four places: the `<article>` in `index.html`, a `createProjectDetail(...)` entry at the matching index, an `.image-grid-NN` rule, and the image folders under `assets/images/projects/projectN/{card,detail,gallery}/`.

Image URLs in the data file are written `../assets/images/...` even though `index.html` sits at the repo root (browsers clamp the leading `../`). Keep that prefix — `getPreviewImageSrc()` in `core/utils.js` inserts `previews/` after `assets/images/` to find the blurred placeholder, and `generate-previews.js` mirrors the same folder tree. Card thumbnails are covered too, even though they are declared as `background-image` rules rather than data entries: the script reads those URLs straight out of `project-grid.css`.

Note the different rule for **CSS**: `url()` resolves against the stylesheet's own location, so component stylesheets one level deep need `../../assets/…`. Moving a rule between `styles/` and `styles/components/` silently breaks its images.

### Module layout

`main.js` waits for the DOM, then calls each component's `init*()`. A component file owns its own `getElementById` lookups and its own module-level state; nothing reaches into another component. Style is ES5-flavoured inside the modules (`function (…) {}` callbacks, no arrow functions, double quotes, 4-space indent) — match it.

`core/` holds only what is genuinely shared:

| file | holds |
| --- | --- |
| `constants.js` | timings, `HERO_PHASES`, the `matchMedia` queries |
| `dom.js` | `html` / `body` |
| `utils.js` | easing, text scramble, formatting, `isMobileHeroMode()` |
| `state.js` | whether the visitor entered, and the name they gave |
| `project-data.js` | `projectDetails`, sliced from the global the data file publishes |
| `sections.js` | the section list, current-section lookup, sticky stack motion |
| `scroll.js` | smooth scroll, the custom inertia scroll, and the wheel/touch listeners |

**Three seams keep the graph acyclic — use them instead of adding cross-component imports:**

- `state.js` exposes `isEntered()` / `getDisplayName()` / `markEntered()` rather than bare variables, because an imported binding is read-only and only the hero may write it.
- `scroll.js` owns the wheel and touch listeners but knows nothing about the hero. The hero registers `setScrollGate({ isLocked, isStoryActive, scrub })`; components that want to react to wheel activity or to a settled programmatic scroll register `onWheelActivity()` / `onScrollSettle()`.
- `unlockPage()` dispatches `portfolio:entered` on `document`. The floating nav listens for it. Anything else gated on entry should listen too, not import from the hero.

Subsystems worth knowing before editing:

- **Enter gate** (`components/hero.js`). `html`/`body` start with `is-locked` (page blurred, scroll disabled) until the name form is submitted. Until then, in-page anchor links are inert.
- **Hero story scrub** (`components/hero.js`). A state machine (`HERO_PHASES`, `heroState`) driven by wheel delta while at scroll top. The wheel only moves `heroStoryTargetProgress`; a rAF loop eases `heroState.progress` toward it and writes `--hero-story-progress` / `--hero-side-pull` / `--hero-side-scale` on `.hero`. The wheel stays captured for as long as that easing is in flight, so the page cannot scroll out from under an unfinished animation — that is what `isSettling` in `scrubHeroStory` is for. Reaching 1 auto-scrolls to `#projects`.
- **Custom inertia scroll** (`core/scroll.js`). Desktop-only wheel hijacking that lerps toward a target scroll position. Disabled for coarse pointers, `max-width: 1024px`, and `prefers-reduced-motion`, and it bails out over scrollable descendants — see `shouldUseInertiaScroll` / `hasScrollableAncestor`.
- **Project detail overlay** (`components/project-detail.js`). Opened by card index. Detail images are appended in batches of 5 (`projectImageBatchSize`) as the user scrolls, each starting as a blurred CSS `--preview-image` until the full image fires `load` and the wrapper gets `is-loaded`. A separate "Gallery" mode renders a looping horizontal stage from `detail.galleryImages`.
- **Cursor follower / image magnifier** (`components/cursor-follower.js`). Replaces the native cursor on desktop, samples the hovered image's rendered geometry (`getRenderedImageMetrics`, `object-position` math) to show a zoom lens, and hides itself on touch or reduced motion.
- **Sticky stacking** (`core/sections.js`, `components/drawings.js`). Sections and drawings cards are `position: sticky` and overlap via `--stack-section-overlap` / `--drawings-card-index`; JS only updates the index and scale variables.
- **Contact dot field** (`components/contact.js`). A `<canvas>` particle grid reacting to pointer position; animated only while the section is visible.
- **Drawings heading** (`components/drawings-title.js`). "THE MOMENTS" is split into per-character spans that float in on an IntersectionObserver, then respond to pointer distance by driving `wght` and `wdth` through `--char-wght` / `--char-wdth`. It needs a width axis, which is why `.drawings-title` alone is set in Roboto Flex rather than Inter. Character boxes are measured once and re-measured on scroll/resize inside the same frame that applies the effect — never per pointer event.

Communication between JS and CSS is almost always via `is-*` class toggles and CSS custom properties rather than inline styles — follow that pattern instead of writing style properties directly.

### Styles

`base.css` holds the reset, the `:root` tokens (project grid geometry, stack overlap, filter panel timings) including their responsive overrides, and bare element styles. Every other rule lives in the `styles/components/*.css` file named after the component that owns it, including that component's own `@media` blocks and `@keyframes`.

Selectors are namespaced by component prefix, so link order in `index.html` does not affect the cascade — but keep `base.css` first. Breakpoints: `1080px` and `768px`, plus `(hover: none), (pointer: coarse)` for touch behaviour and a `prefers-reduced-motion` block. The mobile branches deliberately turn off the hero story and inertia scroll, so test changes at both widths.
