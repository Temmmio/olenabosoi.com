// Osmo resource from the Osmo library (Elastic Line).
// Two site changes, marked below: a softer bend, and the line flashes in --elastic-line-flash
// (set in css/main.css) when it bounces, then fades back to its own colour.
function initElasticLine() {
  // Site change: a softer bend (Osmo: sensitivity 40, stretch 0.1).
  var sensitivity = 20;
  var stretch = 0.04;

  document.querySelectorAll('[data-elastic-line]').forEach((svg) => {
    const path = svg.querySelector('path');
    const viewBox = svg.viewBox.baseVal;
    if (!path || !viewBox.width || !viewBox.height) return;

    const center = viewBox.y + viewBox.height * 0.5;
    const start = viewBox.x;
    const end = viewBox.x + viewBox.width;

    let previous, tl;
    const state = { x: viewBox.x + viewBox.width * 0.5, y: 0, flash: 0 }; // Site change: flash

    function render() {
      path.setAttribute('d', `M${start} ${center} Q${state.x} ${center + state.y * 2} ${end} ${center}`);
      // Site change: mix the flash colour into the line's own (currentColor).
      const flashColor = getComputedStyle(svg).getPropertyValue('--elastic-line-flash').trim();
      path.style.stroke = flashColor && state.flash > 0
        ? `color-mix(in srgb, ${flashColor} ${state.flash * 100}%, currentColor)`
        : '';
    }

    function toSVG(x, y) {
      const point = new DOMPoint(x, y);
      return point.matrixTransform(svg.getScreenCTM().inverse());
    }

    function onPointerMove(e) {
      if (!previous) {
        previous = e;
        return;
      }

      const prev = previous;
      previous = e;

      if (e.timeStamp - prev.timeStamp > 150) return;

      const bounds = svg.getBoundingClientRect();
      const lineY = bounds.top + bounds.height * 0.5;
      const from = prev.clientY - lineY;
      const to = e.clientY - lineY;

      if (from * to > 0) return;

      const dx = e.clientX - prev.clientX;
      const dy = e.clientY - prev.clientY;
      if (!dy) return;

      const progress = -from / dy;
      const screenX = prev.clientX + dx * progress;
      if (screenX <= bounds.left || screenX >= bounds.right) return;

      const point = toSVG(screenX, lineY);
      const velocity = Math.abs(dy) / Math.max(1, e.timeStamp - prev.timeStamp);
      const amount = Math.min(bounds.width * stretch, velocity * sensitivity);

      const fromSVG = toSVG(screenX, lineY);
      const toSVGPoint = toSVG(screenX, lineY + amount);
      const svgAmount = Math.abs(toSVGPoint.y - fromSVG.y);

      tl?.kill();
      state.x = point.x;

      tl = gsap.timeline({ onUpdate: render });
      tl.to(state, { y: Math.sign(dy) * svgAmount, flash: 1, duration: 0.1, ease: 'power2.out' }); // Site change: flash
      tl.to(state, { y: 0, duration: 1.5, ease: 'elastic.out(1, 0.3)' });
      tl.to(state, { flash: 0, duration: 0.8, ease: 'power2.out' }, '<'); // Site change: fade the flash
    }

    render();

    const mm = gsap.matchMedia();

    mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      window.addEventListener('pointermove', onPointerMove);

      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        previous = null;
      };
    });
  });
}

// Initialize Elastic Line
document.addEventListener('DOMContentLoaded', () => {
  initElasticLine();
});
