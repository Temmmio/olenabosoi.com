// Osmo resource, copied verbatim from Osmo Supply (Stacking Sticky Cards (Bounce)).
gsap.registerPlugin(ScrollTrigger);

function initStackingStickyCardsBounce() {
  const cardsSections = document.querySelectorAll('[data-stacking-cards-init]');
  
  const currentTier = getCurrentViewportTier();
  window.viewportTier = currentTier;

  ScrollTrigger.getAll().forEach((trigger) => {
    cardsSections.forEach((section) => {
      if (section.contains(trigger.trigger)) trigger.kill();
    });
  });

  cardsSections.forEach((section) => {
    section.querySelectorAll('[data-stacking-card-target]').forEach((el) => {
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: 'all' });
    });
  });

  cardsSections.forEach((section) => {
    const tier = currentTier;

    const isEnabled = (tier === 'desktop' && section.dataset.stackingCardsDesktop === 'true') ||
      (tier === 'tablet' && section.dataset.stackingCardsTablet === 'true') ||
      ((tier === 'mobile-portrait' || tier === 'mobile-landscape') &&
        section.dataset.stackingCardsMobile === 'true'
      );

    if (!isEnabled) return;

    const cards = Array.from(section.querySelectorAll('[data-stacking-card]'));
    if (!cards.length) return;

    const stickyTop = parseFloat(getComputedStyle(cards[0]).top) || 0;

    const rotateValues = (() => {
      if (tier === 'desktop') return parseRotateValues(section, 'data-stacking-cards-desktop-rotate');
      if (tier === 'tablet') return parseRotateValues(section, 'data-stacking-cards-tablet-rotate');
      return parseRotateValues(section, 'data-stacking-cards-mobile-rotate');
    })();

    const xValues = (() => {
      if (tier === 'desktop') return parseAxisValues(section, 'data-stacking-cards-desktop-x');
      if (tier === 'tablet') return parseAxisValues(section, 'data-stacking-cards-tablet-x');
      return parseAxisValues(section, 'data-stacking-cards-mobile-x');
    })();

    const yValues = (() => {
      if (tier === 'desktop') return parseAxisValues(section, 'data-stacking-cards-desktop-y');
      if (tier === 'tablet') return parseAxisValues(section, 'data-stacking-cards-tablet-y');
      return parseAxisValues(section, 'data-stacking-cards-mobile-y');
    })();

    cards.forEach((card, index) => {
      const targetEl = card.querySelector('[data-stacking-card-target]');
      if (!targetEl) return;

      const rotate = rotateValues[index % rotateValues.length];
      const x = xValues[index % xValues.length];
      const y = yValues[index % yValues.length];

      gsap.set(targetEl, {
        rotate: 0,
        x: 0,
        y: 0,
        scale: 1,
        zIndex: cards.length - index
      });

      gsap.to(targetEl, {
        rotate,
        x,
        y,
        ease: 'power1.in',
        overwrite: 'auto',
        scrollTrigger: {
          id: `stacking-rotate-${index}`,
          trigger: card,
          start: 'top 75%',
          end: `top-=${stickyTop} top`,
          scrub: true
        }
      });

      ScrollTrigger.create({
        id: `stacking-bounce-${index}`,
        trigger: card,
        start: `top-=${stickyTop} top`,
        onEnter: () => pulseElement(targetEl)
      });
    });
  });

  ScrollTrigger.refresh();
  
  function parseRotateValues(section, attr) {
    const fallback = [0, 4, -4];
    const values = (section.getAttribute(attr) || '').split(',').map((val) => parseFloat(val.trim()));
    return values.length >= 1 && values.every((v) => !isNaN(v)) ? values : fallback;
  }

  function parseAxisValues(section, attr) {
    const raw = section.getAttribute(attr);
    if (!raw) return ['0em', '0em', '0em'];
    const values = raw.split(',').map((val) => val.trim()).filter((val) => val !== '');
    return values.length ? values : ['0em', '0em', '0em'];
  }

  if (!window._hasStackingResizeListener) {
    let last = getCurrentViewportTier();

    window.addEventListener('resize', debounceOnWidthChange(() => {
      const next = getCurrentViewportTier();

      if (last !== next) {
        ScrollTrigger.getAll().forEach((t) => {
          if (t.vars?.id?.startsWith('stacking')) t.kill();
        });

        cardsSections.forEach((section) => {
          section.querySelectorAll('[data-stacking-card-target]').forEach((el) => {
            gsap.killTweensOf(el);
            gsap.set(el, { clearProps: 'all' });
          });
        });

        initStackingStickyCardsBounce();
      }

      last = next;
      window.viewportTier = next;
    }, 250));

    window._hasStackingResizeListener = true;
  }

  // Helper: Get Current Viewport Tier
  function getCurrentViewportTier() {
    const width = window.innerWidth;

    if (width <= 479) return 'mobile-portrait';
    if (width <= 767) return 'mobile-landscape';
    if (width <= 991) return 'tablet';
    return 'desktop';
  }

  // Helper: Pulse pulse (Bounce Animation)
  function pulseElement(targetEl) {
    const width = targetEl.offsetWidth;
    const height = targetEl.offsetHeight;
    const fontSize = parseFloat(getComputedStyle(targetEl).fontSize);
    const stretchPx = 1.5 * fontSize;
    const targetScaleX = (width + stretchPx) / width;
    const targetScaleY = (height - stretchPx * 0.33) / height;

    const tl = gsap.timeline();
    tl.to(targetEl, {
      scaleX: targetScaleX,
      scaleY: targetScaleY,
      duration: 0.1,
      ease: 'power1.out'
    }).to(targetEl, {
      scaleX: 1,
      scaleY: 1,
      duration: 1,
      ease: 'elastic.out(1, 0.3)'
    });
  }
}

// Debouncer: For resizing the window
function debounceOnWidthChange(fn, ms) {
  let last = innerWidth;
  let timer;

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

// Initialize Stacking Sticky Cards (Bounce)
document.addEventListener('DOMContentLoaded', function () {
  initStackingStickyCardsBounce();
});
