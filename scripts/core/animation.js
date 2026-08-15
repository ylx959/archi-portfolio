// One GSAP registration point for the whole site, so no component has to know
// whether ScrollTrigger has been registered yet — importing gsap from here is
// enough.
//
// Nothing in this file reads scroll position: core/scroll.js owns Lenis and
// drives both the Lenis rAF loop and ScrollTrigger.update from gsap's ticker,
// which is what keeps the smoothed scroll and every scroll-linked value on the
// same frame. Without that, ScrollTrigger samples the real scrollTop while Lenis
// is still easing toward it and the sticky stack lags a frame behind the page.
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// gsap smooths over long frames by pretending they were short, which is right
// for a tween playing on its own clock and wrong for anything reading scroll:
// a stalled frame would hand Lenis a shortened delta and the page would drift
// away from where the wheel actually left it. Turning it off is the pairing
// Lenis documents.
//
// The consequence, and it is easy to mistake for a bug: a backgrounded tab
// throttles requestAnimationFrame, so the first frame after coming back carries
// the whole gap as one delta and any tween still in flight lands on its end
// value in a single step rather than easing the rest of the way. That is correct
// for anything scroll-linked — it should match where the page actually is — and
// it is why the hero's scrub appears to jump if you leave and return mid-scrub.
gsap.ticker.lagSmoothing(0);

export { gsap, ScrollTrigger };
