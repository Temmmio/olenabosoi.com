// Osmo resource from the Osmo library (Dropping Cards Loading Animation).
// Two site changes, marked below: the cards start falling sooner, and the hero
// photo scales from 1.25 over a longer time.
gsap.registerPlugin(CustomEase);
CustomEase.create("osmo", "M0,0 C0.625,0.05 0,1 1,1");

function initDroppingCardsLoadingAnimation() {
  const container = document.querySelector("[data-loading-container]");
  const cardsList = gsap.utils.toArray(container.querySelectorAll("[data-loading-cards-list]"));
  const cards = gsap.utils.toArray(container.querySelectorAll("[data-loading-card]"));
  const background = container.querySelectorAll("[data-loading-background]");
  const logo = container.querySelectorAll("[data-loading-logo]");
  const header = document.querySelectorAll("[data-loading-header]");

  const scaleDecrease = 0.1;
  const yOffset = -7.5;
  const totalFallStagger = 0.75;
  const deckMoveDuration = 1;
  const rotationPattern = [-10, 10, -15, 10, 20];
  const xPattern = [-5, 7.5, 10, 5, -10];

  const has = (items) => items.length;
  const patternValue = (pattern, index) => pattern[index % pattern.length];

  function getStack(index, total) {
    const reverseIndex = total - 1 - index;
    return {
      scale: 1 - (reverseIndex * scaleDecrease),
      yPercent: reverseIndex * yOffset
    };
  }

  function stackProp(prop, total) {
    return (index) => getStack(index, total)[prop];
  }

  function getFallY(card) {
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    return (containerRect.bottom - cardRect.top) + cardRect.height;
  }

  const tl = gsap.timeline();

  if (has(cardsList)) {
    tl.fromTo(cardsList, {
      opacity: 0
    }, {
      opacity: 1,
      duration: 0.3,
    }, 0.5);
  }
  
  if (has(cards)) {
    tl.fromTo(cards, {
      rotate: 0.001,
      scale: 0.5,
      yPercent: 0,
    }, {
      rotate: 0.001,
      scale: stackProp("scale", cards.length),
      yPercent: stackProp("yPercent", cards.length),
      stagger: -0.05,
      duration: 1.5,
      ease: "elastic.out(1,0.7)",
    }, "<");

    const fallCards = cards.slice().reverse();
    const fallStagger = totalFallStagger / Math.max(cards.length - 1, 1);
    // Site change: the cards start falling 1s sooner (Osmo: once the elastic
    // stack-in has fully finished). Its last 1s is a barely visible wobble, so
    // that read as a pause after the cards appeared.
    const fallStart = tl.duration() - 1;

    fallCards.forEach((card, fallIndex) => {
      const remainingCards = cards.slice(0, cards.indexOf(card));
      const fallTime = fallStart + (fallIndex * fallStagger);

      if (has(remainingCards)) {
        tl.to(remainingCards, {
          scale: stackProp("scale", remainingCards.length),
          yPercent: stackProp("yPercent", remainingCards.length),
          duration: deckMoveDuration,
          ease: "sine.inOut",
        }, fallTime);
      }

      tl.to(card, {
        y: () => getFallY(card),
        xPercent: patternValue(xPattern, fallIndex),
        rotate: patternValue(rotationPattern, fallIndex),
        duration: 0.8,
        ease: "power4.in"
      }, fallTime);
    });
  }

  if (has(background)) {
    tl.to(background, {
      rotate: 0.001,
      yPercent: 100,
      duration: 1.5,
      ease: "osmo",
    }, "-=0.6");
  }

  if (has(header)) {
    tl.from(header, {
      rotate: 0.001,
      yPercent: -25,
      duration: 1.5,
      ease: "osmo",
    }, "<");
    // Site change: the scale is larger (Osmo: 1.1) and settles over 4s, much
    // longer than the slide. It runs as its own tween, started from the
    // timeline, so the loader still ends (and unlocks scrolling) on time.
    gsap.set(header, { scale: 1.25 });
    tl.call(() => {
      gsap.fromTo(header, { scale: 1.25 }, { scale: 1, duration: 4, ease: "power2.out" });
    }, null, "<");
  }

  if (has(logo)) {
    tl.to(logo, {
      rotate: 0.001,
      yPercent: 100,
      opacity: 0,
      duration: 0.8,
      ease: "power4.in"
    }, "<-=1.5");
  }

  // Site integration: hand the timeline back so js/main.js can sync the hero intro to it.
  return tl;
}

// Site integration: initialised from js/main.js, only when the hero intro plays.
