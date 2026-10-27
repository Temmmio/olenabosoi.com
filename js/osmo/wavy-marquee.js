// Osmo resource, copied verbatim from Osmo Supply (Wavy Marquee).
gsap.registerPlugin(Observer, ScrollTrigger);

function initWavyMarquee() {
  document.querySelectorAll('[data-wavy-marquee-init]').forEach((container) => {
    const autoSpeed = 100;
    const viewport = [
      [992, 1, 1],
      [768, 0.75, 1],
      [480, 0.6, 0.75],
      [0, 0.5, 0.75]
    ];
    const scrollSpeed = 0.0075;
    const dragSpeed = 0.5;
    const maxDragSpeed = 75;
    const dragEase = 0.1;
    const waveY = 0.25;
    const waveBoost = 0.01;
    const itemsPerWave = 10;
    const waveTravel = 0.25;

    const getViewport = () => viewport.find(([min]) => innerWidth >= min).slice(1);

    container._wavyMarqueeObserver?.kill();
    container._wavyMarqueeTrigger?.kill();

    if (container._wavyMarqueeTick) gsap.ticker.remove(container._wavyMarqueeTick);
    if (container._wavyMarqueeResize) window.removeEventListener('resize', container._wavyMarqueeResize);

    const list = container.querySelector('[data-wavy-marquee-list]');
    if (!list) return;

    const originals = [...list.querySelectorAll('[data-wavy-marquee-item]')].map((item) => item.cloneNode(true));
    if (!originals.length) return;

    const baseDirection = container.dataset.wavyMarqueeDirection === 'flipped' ? 1 : -1;
    const setX = gsap.quickSetter(list, 'x', 'px');
    const fullCircle = Math.PI * 2;

    let items = [];
    let loopWidth = 0, waveLength = 0, averageWidth = 1, travel = 0, pausePadding = 0;
    let speed = 1, targetSpeed = 1, direction = baseDirection;
    let isActive = false, isDragging = false;
    let [speedScale, waveScale] = getViewport();

    function addBatch() {
      const fragment = document.createDocumentFragment();
      originals.forEach((item) => fragment.appendChild(item.cloneNode(true)));
      list.appendChild(fragment);
    }

    function buildLoop() {
      list.innerHTML = '';

      addBatch();
      addBatch();

      const firstItems = [...list.querySelectorAll('[data-wavy-marquee-item]')];
      loopWidth = firstItems[originals.length].offsetLeft - firstItems[0].offsetLeft;

      for (let i = 2; i < Math.max(2, Math.ceil(container.offsetWidth / loopWidth) + 1); i++) {
        addBatch();
      }

      items = [...list.querySelectorAll('[data-wavy-marquee-item]')];

      const originalItems = firstItems.slice(0, originals.length);
      averageWidth = originalItems.reduce((sum, item) => sum + item.offsetWidth, 0) / originals.length;
      waveLength = Math.max(container.offsetWidth, averageWidth * itemsPerWave) * waveScale;

      let maxHeight = 0;

      for (const item of items) {
        item._x = item.offsetLeft;
        item._width = item.offsetWidth;
        item._height = item.offsetHeight;
        item._setY = gsap.quickSetter(item, 'y', 'px');
        maxHeight = Math.max(maxHeight, item._height);
      }

      pausePadding = maxHeight * (Math.abs(waveY) + 1);
      render();
    }

    function render() {
      if (!loopWidth || !waveLength) return;

      const x = gsap.utils.wrap(-loopWidth, 0, travel);
      const dynamicWaveY = waveY + (speed - 1) * waveBoost;
      const phaseTravel = travel / waveLength * fullCircle * waveTravel;
      const containerWidth = container.offsetWidth;

      setX(x);

      for (const item of items) {
        const itemX = item._x + x;
        if (itemX + item._width < 0 || itemX > containerWidth) continue;

        const phase = itemX / waveLength * fullCircle + phaseTravel;
        item._setY(Math.sin(phase) * item._height * dynamicWaveY);
      }
    }

    function tick(_, deltaTime) {
      if (!isActive || !loopWidth) return;

      speed += ((targetSpeed !== 1 ? targetSpeed : 1) - speed) * dragEase;
      if (targetSpeed !== 1) targetSpeed += (1 - targetSpeed) * dragEase;

      travel += autoSpeed * speedScale * speed * direction * deltaTime / 1000;
      render();
    }

    container._wavyMarqueeObserver = Observer.create({
      target: container,
      type: 'touch,pointer',
      lockAxis: true,
      onChangeX: (self) => {
        if (!isActive || !self.deltaX) return;

        isDragging = true;
        container.style.cursor = 'grabbing';
        direction = self.deltaX > 0 ? 1 : -1;

        const dragAmount = Math.abs(self.deltaX) / averageWidth * 100 * dragSpeed;
        targetSpeed = Math.min(1 + dragAmount, maxDragSpeed);
      },
      onRelease: () => {
        isDragging = false;
        container.style.cursor = 'grab';
      }
    });

    container._wavyMarqueeTrigger = ScrollTrigger.create({
      trigger: container,
      start: () => `top-=${pausePadding}px bottom`,
      end: () => `bottom+=${pausePadding}px top`,
      invalidateOnRefresh: true,
      onToggle: (self) => isActive = self.isActive,
      onUpdate: (self) => {
        if (isDragging) return;

        direction = self.direction === 1 ? -baseDirection : baseDirection;
        speed = 1 + Math.abs(self.getVelocity()) * scrollSpeed;
      }
    });

    buildLoop();

    isActive = ScrollTrigger.isInViewport(container);
    container._wavyMarqueeTick = tick;
    gsap.ticker.add(tick);

    container._wavyMarqueeResize = debounceOnWidthChange(() => {
      [speedScale, waveScale] = getViewport();
      buildLoop();
      ScrollTrigger.refresh();
    }, 150);

    window.addEventListener('resize', container._wavyMarqueeResize);
  });
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth, timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

// Initialize Wavy Marquee
document.addEventListener('DOMContentLoaded', () => {
  initWavyMarquee();
});
