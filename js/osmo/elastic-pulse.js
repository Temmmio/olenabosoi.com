// Osmo resource, copied verbatim from Osmo Supply (Elastic Pulse Button (Bouncy)).
// Used on the Work banners; the button CSS from the resource is not needed.
function initElasticPulseButton() {
  // Skip on touch devices
  if (window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

  document.querySelectorAll('[data-elastic-pulse-btn]').forEach(btn => {
    const target = btn.querySelector('[data-elastic-pulse-target]') || btn;
    let hoverLocked = false;

    btn.addEventListener('mouseenter', () => {
      if (hoverLocked) return;
      hoverLocked = true;
      setTimeout(() => { hoverLocked = false; }, 500);

      const el = target;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const stretch = 0.75 * fs;
      const sx = (w + stretch) / w;
      const sy = (h - stretch * 0.33) / h;

      if (el._pulseTl && el._pulseTl.kill) el._pulseTl.kill();
      el._pulseTl = gsap.timeline()
        .to(el, { scaleX: sx, scaleY: sy, duration: 0.1, ease: 'power1.out' })
        .to(el, { scaleX: 1, scaleY: 1, duration: 1, ease: 'elastic.out(1, 0.3)' });
    });
  });
}

// Initialize Elastic Pulse Button (Bouncy)
document.addEventListener('DOMContentLoaded', () => {
  initElasticPulseButton();
});
