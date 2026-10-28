// Osmo resource from the Osmo library (Variable Font Weight Hover).
// Site changes, marked below: weight follows the cursor's x position only;
// a letter is only updated when its target weight changes; the effect pauses
// while its element has [data-font-weight-hover-paused] (set in the HTML and
// from js/main.js, so it stays off through the loader, the intro and each
// shimmer); when the pause ends the letters ease into the cursor's shape over
// a moment instead of jumping (towards the middle of the screen if the cursor
// hasn't moved yet), or, after a shimmer, a virtual cursor glides from where the
// shimmer's wave ended to the real one; every weight tween starts from the
// letter's current weight; and
// a weight set from outside is kept when the effect first activates.
gsap.registerPlugin(SplitText);

function initVariableFontWeightHover() {
  // Return on touchscreens or when user prefers reduced motion
  const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (isTouch || reduceMotion) return;
  
  const targets = document.querySelectorAll("[data-font-weight-hover]");
  if (!targets.length) return;

  const rangeDefault = 500;

  const mouse = { x: 0, y: 0 };
  let hasPointer = false;
  let isActive = false;
  // Site change: the ease into the cursor's shape after a pause.
  // The site's "osmo" ease (CustomEase, js/osmo/dropping-cards-loader.js), looked up on first use.
  const resumeMs = 700;
  // The glide eases out of the wave's end and slows right down as it
  // reaches the cursor (expo.inOut), over a longer stretch.
  const glideMs = 2000;
  let glideEase;
  let osmoEase;
  const resumeEase = (t) => (osmoEase = osmoEase || gsap.parseEase("osmo") || gsap.parseEase("power2.inOut"))(t);
  const isPaused = (d) => d.host.hasAttribute("data-font-weight-hover-paused");
  const currentWeight = (d) => parseFloat(d.el.style.getPropertyValue("--wght")) || d.minw;

  const chars = [];

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function numAttr(el, key, fallback) {
    const v = parseFloat(el.dataset[key]);
    return Number.isFinite(v) ? v : fallback;
  }

  function readFontWeight(el) {
    const fw = getComputedStyle(el).fontWeight;
    const parsed = parseFloat(fw);
    if (Number.isFinite(parsed)) return parsed;
    if (fw === "bold") return 700;
    return 400; // "normal" fallback
  }

  function weightFromDistance(dist, minw, maxw, range) {
    if (dist >= range) return minw;
    const t = 1 - dist / range;
    return minw + (maxw - minw) * t;
  }

  function calculatePositions() {
    for (let i = 0; i < chars.length; i++) {
      const r = chars[i].el.getBoundingClientRect();
      chars[i].cx = r.left + r.width / 2 + window.scrollX;
      chars[i].cy = r.top + r.height / 2 + window.scrollY;
    }
  }

  function splitChars(el) {
    if (el.dataset.fontWeightHoverInit === "true") return null;
    el.dataset.fontWeightHoverInit = "true";

    el.fontWeightHoverSplit =
      el.fontWeightHoverSplit ||
      new SplitText(el, { type: "chars,words", charsClass: "char" });

    return el.fontWeightHoverSplit.chars || [];
  }

  function activate() {
    if (isActive) return;
    isActive = true;

    // Apply variable-font wiring without changing the visible weight
    for (let i = 0; i < chars.length; i++) {
      const d = chars[i];
      // Site change: keep a weight js/main.js already set (the name settles on
      // its lightest weight after the intro), so the first move doesn't jump.
      if (!d.el.style.getPropertyValue("--wght")) d.el.style.setProperty("--wght", d.startw);
      d.el.style.fontVariationSettings = "'wght' var(--wght)";
    }

    calculatePositions();
  }

  targets.forEach((el) => {
    const minw = numAttr(el, "min", 300);
    const maxw = numAttr(el, "max", 900);
    const range = numAttr(el, "range", rangeDefault);

    const split = splitChars(el);
    if (!split) return;

    split.forEach((ch) => {
      const startw = readFontWeight(ch);

      const d = {
        el: ch,
        host: el, // Site change: for the pause check below.
        resting: true, // Site change: eases in when the pause ends (see the ticker).
        cx: 0,
        cy: 0,
        startw,
        minw,
        maxw,
        range,
        setw: gsap.quickTo(ch, "--wght", {
          duration: 0.4,
          ease: "power2.out",
          overwrite: "auto",
        }),
      };
      chars.push(d);
    });
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      hasPointer = true;
      mouse.x = e.pageX;
      mouse.y = e.pageY;

      if (!isActive) activate();
    },
    { passive: true }
  );

  window.addEventListener("resize", () => isActive && calculatePositions(), { passive: true });
  window.addEventListener("scroll", () => isActive && calculatePositions(), { passive: true });

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => isActive && calculatePositions()).catch(() => {});
  }

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(() => isActive && calculatePositions());
    targets.forEach((el) => ro.observe(el));
  }

  gsap.ticker.add(() => {
    // Site change: runs without a cursor move too, once a pause has ended,
    // so the letters can ease in on their own.
    if (!isActive) {
      if (!chars.some((d) => !isPaused(d))) return;
      activate();
    }
    const now = performance.now();

    for (let i = 0; i < chars.length; i++) {
      const d = chars[i];
      // Site change: paused from outside (the loader, the intro, a shimmer,
      // the name sinking): the letters are left alone, and ease in later.
      if (isPaused(d)) {
        d.resting = true;
        d.resumeAt = 0;
        d.glide = null;
        d.lastw = undefined;
        continue;
      }
      // Site change: distance along the x axis only, so the cursor's height
      // doesn't matter. No cursor move yet: as if it were in the middle of the screen.
      const x = hasPointer ? mouse.x : window.scrollX + window.innerWidth / 2;
      const dist = Math.abs(x - d.cx);
      const w = clamp(weightFromDistance(dist, d.minw, d.maxw, d.range), d.minw, d.maxw);
      // Site change: the pause has just ended. Stop any weight tween left
      // over, and ease from the current weight to the cursor's shape,
      // following the cursor if it moves meanwhile.
      if (d.resting) {
        d.resting = false;
        d.resumeAt = now;
        d.resumeFrom = currentWeight(d);
        gsap.getTweensOf(d.el).forEach((tween) => "--wght" in tween.vars && tween.pause());
        // A shimmer (js/main.js) left where its wave ended and how wide it
        // was: glide from there instead, shared by the host's letters.
        if (d.host.fontWeightHoverGlide) {
          d.host.fontWeightHoverActiveGlide = { ...d.host.fontWeightHoverGlide, at: now };
          delete d.host.fontWeightHoverGlide;
        }
        d.glide = d.host.fontWeightHoverActiveGlide;
        if (d.glide && d.glide.at !== now) d.glide = null;
      }
      // Site change: the glide. A virtual cursor moves from the wave's end to
      // the cursor (followed if it moves meanwhile), and the wave narrows from
      // the shimmer's width to the hover's, so it reads as one wave carried
      // over to the cursor.
      if (d.glide) {
        const t = Math.min(1, (now - d.glide.at) / glideMs);
        const e = (glideEase = glideEase || gsap.parseEase("expo.inOut"))(t);
        const vx = d.glide.x + (x - d.glide.x) * e;
        const range = d.glide.range + (d.range - d.glide.range) * e;
        const gw = clamp(weightFromDistance(Math.abs(vx - d.cx), d.minw, d.maxw, range), d.minw, d.maxw);
        d.el.style.setProperty("--wght", gw);
        if (t < 1) continue;
        d.glide = null;
        d.resumeAt = 0;
        d.lastw = w;
        continue;
      }
      if (d.resumeAt) {
        const t = Math.min(1, (now - d.resumeAt) / resumeMs);
        d.el.style.setProperty("--wght", d.resumeFrom + (w - d.resumeFrom) * resumeEase(t));
        if (t < 1) continue;
        d.resumeAt = 0;
        d.lastw = w;
        continue;
      }
      // Site change: only restart the tween when the target weight changes, so an
      // idle cursor doesn't make the hero card redraw on every frame.
      if (Math.abs(w - (d.lastw ?? -1)) < 0.5) continue;
      d.lastw = w;
      // Site change: from the letter's current weight, not the tween's last
      // value, which is stale after a pause.
      d.setw(w, currentWeight(d));
    }
  });
}

// Init Variable Font Weight Hover
document.addEventListener("DOMContentLoaded", () => {
  initVariableFontWeightHover();
});
