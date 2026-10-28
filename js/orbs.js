// Services and Process cards: a small "thinking orb" in each card's top-right
// corner. The orbs are Thinking Orbs by Jakub Antalik (libraries.dev/orbs,
// npm thinking-orbs, MIT), drawn with the package's framework-free engine
// (thinking-orbs/engine) the way its React component does: one frame per
// animation frame, at the 64px preset, time scaled by the preset's speed.
// The preset is drawn scaled up to the canvas's CSS size (main.css), so the
// orb keeps the 64px design at any size.
// Site changes: no React; the dots tinted with the accent colour
// (--accent-ui), so the colour themes reach them; they run only while on
// screen and the tab is visible; reduced motion gets one still frame.
// Markup: <canvas data-orb="searching"> (any of the package's states).
import { MODE_FRAMES, paintFrame, resolvePreset } from "https://cdn.jsdelivr.net/npm/thinking-orbs@0.3.2/dist/engine.es.js";

const size = 64; // the package's main preset, in CSS px
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// The engine shades each dot from the accent towards black by its "white"
// value (0 = the accent itself), so on a dark card the far dots sink into it.
// On a light card that reads as a dark smudge, and its light mode shades
// towards white, paler than the accent. So the light theme (js/main.js)
// paints the same frame itself: every dot in the accent, its shade turned
// into transparency instead, which over a dark card is what the engine draws.
const isLight = () => document.documentElement.dataset.theme === "light";
const accentInk = (tint, shade, alpha) =>
  `rgba(${tint.r},${tint.g},${tint.b},${alpha * (1 - Math.min(1, Math.max(0, shade)))})`;
function paintLight(ctx, frame, tint) {
  for (const l of frame.lines) {
    ctx.strokeStyle = accentInk(tint, l.white, l.a ?? 1);
    ctx.lineWidth = l.w;
    ctx.beginPath();
    ctx.moveTo(l.x1, l.y1);
    ctx.lineTo(l.x2, l.y2);
    ctx.stroke();
  }
  for (const d of frame.dots) {
    ctx.fillStyle = accentInk(tint, d.white, d.a ?? 1);
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// The accent colour as the engine's tint: { r, g, b }, 0–255.
const tintOf = (canvas) => {
  const [r, g, b] = getComputedStyle(canvas).color.match(/[\d.]+/g).map(Number);
  const scale = getComputedStyle(canvas).color.startsWith("color(") ? 255 : 1;
  return { r: r * scale, g: g * scale, b: b * scale };
};

function initOrb(canvas) {
  const { mode, speed, opts } = resolvePreset(canvas.dataset.orb, size);
  const frameFn = MODE_FRAMES[mode];
  if (!frameFn) return;
  // offsetWidth, not the bounding box: the stacked cards are rotated and scaled.
  const shown = canvas.offsetWidth || size;
  const ratio = Math.min(2, window.devicePixelRatio || 1) * (shown / size);
  canvas.width = Math.round(size * ratio);
  canvas.height = Math.round(size * ratio);
  const ctx = canvas.getContext("2d");
  let tint = tintOf(canvas);
  // The theme switch (js/main.js) changes the accent.
  window.addEventListener("themechange", () => {
    tint = tintOf(canvas);
    if (reduced || !running) draw(reduced ? 0.6 : (performance.now() / 1000) * speed);
  });

  const draw = (seconds) => {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const frame = frameFn(size, seconds, opts);
    if (isLight()) paintLight(ctx, frame, tint);
    else paintFrame(ctx, frame, true, tint);
  };

  if (reduced) {
    draw(0.6);
    return;
  }

  let raf = 0;
  let running = false;
  let visible = false;
  const loop = () => {
    draw((performance.now() / 1000) * speed);
    if (running) raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  draw((performance.now() / 1000) * speed);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && document.visibilityState !== "hidden") start();
    else stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stop();
    else if (visible) start();
  });
}

document.querySelectorAll("[data-orb]").forEach(initOrb);
