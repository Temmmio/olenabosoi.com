// Osmo resource from the Osmo library (Variable Font Weight Hover).
// Four site changes, marked below: weight follows the cursor's x position only,
// a letter is only updated when its target weight changes, the effect pauses
// while its element has [data-font-weight-hover-paused] (set from js/main.js)
// and only resumes on the next cursor move, and a weight set from outside is
// kept when the effect first activates.
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
  let lastMove = 0; // Site change: time of the latest pointer move, for the pause below.
  let isActive = false;

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

      chars.push({
        el: ch,
        host: el, // Site change: for the pause check below.
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
      });
    });
  });

  window.addEventListener(
    "pointermove",
    (e) => {
      hasPointer = true;
      lastMove = performance.now(); // Site change
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
    if (!hasPointer || !isActive) return;

    for (let i = 0; i < chars.length; i++) {
      const d = chars[i];
      // Site change: paused from outside; forget the last weight so the cursor
      // takes over again as soon as the pause ends.
      if (d.host.hasAttribute("data-font-weight-hover-paused")) {
        d.lastw = undefined;
        d.pausedAt = performance.now();
        continue;
      }
      // Site change: after a pause, wait for the cursor to move again, so the
      // letters stay as they were left until the visitor actually moves it.
      if (d.pausedAt) {
        if (lastMove < d.pausedAt) continue;
        d.pausedAt = 0;
      }
      // Site change: distance along the x axis only, so the cursor's height doesn't matter.
      const dist = Math.abs(mouse.x - d.cx);
      const w = clamp(weightFromDistance(dist, d.minw, d.maxw, d.range), d.minw, d.maxw);
      // Site change: only restart the tween when the target weight changes, so an
      // idle cursor doesn't make the hero card redraw on every frame.
      if (Math.abs(w - (d.lastw ?? -1)) < 0.5) continue;
      d.lastw = w;
      d.setw(w);
    }
  });
}

// Init Variable Font Weight Hover
document.addEventListener("DOMContentLoaded", () => {
  initVariableFontWeightHover();
});
