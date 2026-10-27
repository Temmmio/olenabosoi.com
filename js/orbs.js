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
  const tint = tintOf(canvas);

  const draw = (seconds) => {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, size, size);
    paintFrame(ctx, frameFn(size, seconds, opts), true, tint);
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
