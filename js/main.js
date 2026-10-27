// ============================================
// olenabosoi.com — site scripts
// Osmo resources live in js/osmo/ and initialise themselves,
// except the loader, which the page intro below drives.
// ============================================

gsap.registerPlugin(SplitText);

// Lenis smooth scroll (Osmo setup, with GSAP ScrollTrigger). Scroll runs on
// GSAP's ticker, so scroll-driven effects such as the hero shrink move in the
// same frame as the page instead of a frame behind it.
let lenis;
function initLenis() {
  // anchors: links to a section (#work…) scroll there smoothly.
  lenis = new Lenis({ anchors: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => {lenis.raf(time * 1000);});
  gsap.ticker.lagSmoothing(0);
}

// Remember the scroll position so the <head> script can tell a scrolled reload
// from a fresh load, skip the intro and restore the position. Saved on every
// scroll: by the time the page is left, the position may already be reset.
function initScrollMemory() {
  const key = "scroll-y:" + location.pathname;
  lenis.on("scroll", ({ scroll }) => {
    try {
      sessionStorage.setItem(key, String(Math.round(scroll)));
    } catch (e) {}
  });
}

// Reload or back/forward: go back to the saved position (the <head> script in
// index.html turns the browser's own restore off and keeps the value). Done
// last, once every scroll effect exists: the pinned blocks add their length
// only when they're set up, and triggers made on a shorter, already scrolled
// page would fire too early (one-off reveals would be spent unseen).
// Still before the first paint, so the page shows up in the right state.
function restoreScroll() {
  const y = window.restoreScrollY;
  if (!y) return;
  // Lenis measures the page lazily; make it see the full length first, or it
  // clamps the jump to the shorter page it saw at start.
  lenis.resize();
  lenis.scrollTo(y, { immediate: true, force: true });
  ScrollTrigger.update();
}

// Seconds between shimmers on touch screens (see shimmerName).
const touchShimmerPause = 2;

// Phones: the hero's "Olena Bosoi" sits at the headings' weight (main.css)
// with no shimmer; the footer one shimmers as everywhere else.
const phoneName = window.matchMedia("(max-width: 767px)");
const nameWeights = (name) => ({ min: parseFloat(name.dataset.min) || 200, max: parseFloat(name.dataset.max) || 600 });
const noShimmer = (name) => phoneName.matches && name.hasAttribute("data-hero-name");

// After "Olena Bosoi" rises (hero intro, hero return, footer) it rests at its
// lightest weight. A shimmer then runs through it: a virtual cursor sweeps left
// to right and the letters swell and fade as it passes, with the same range and
// weights as the hover. After that the weight hover takes over, from the next
// real cursor move; touch screens repeat the shimmer instead. stillShown() guards against the name having been hidden again.
function shimmerName(name, chars, stillShown = () => true) {
  if (noShimmer(name)) return null;
  const { min, max } = nameWeights(name);
  // A wider wave than the hover's (1.6x): more letters lit at once, so the sweep
  // reads as one smooth pass, not letter by letter.
  const range = (parseFloat(name.dataset.range) || 300) * 1.6;
  const centers = chars.map((char) => {
    const box = char.getBoundingClientRect();
    return box.left + box.width / 2;
  });
  const sweep = { x: centers[0] - range };

  // The cursor effect is off for the whole shimmer: paused, and any weight
  // tween it still has running is paused too (not killed: the hover reuses
  // them and restarts them on the next move), so nothing fights the sweep.
  name.setAttribute("data-font-weight-hover-paused", "");
  gsap.getTweensOf(chars).forEach((tween) => "--wght" in tween.vars && tween.pause());

  name._shimmer?.kill();
  name._shimmer = gsap.to(sweep, {
    x: centers[centers.length - 1] + range,
    duration: 3.1,
    ease: "osmo",
    onUpdate: () => {
      chars.forEach((char, index) => {
        const distance = Math.abs(sweep.x - centers[index]);
        const weight = distance >= range ? min : min + (max - min) * (1 - distance / range);
        char.style.setProperty("--wght", weight);
      });
    },
    onComplete: () => {
      chars.forEach((char) => char.style.setProperty("--wght", min));
      if (!stillShown()) return;
      name.removeAttribute("data-font-weight-hover-paused");
      // Touch screens have no weight hover to take over, so the shimmer comes
      // back every couple of seconds instead, for as long as the name is shown
      // (restName stops it). Same test as the Osmo weight hover's.
      if (window.matchMedia("(hover: none), (pointer: coarse)").matches) {
        shimmerNameAfter(touchShimmerPause, name, chars, stillShown);
      }
    },
  });
  return name._shimmer;
}

// Starts the shimmer partway through the rise, so it follows the letters up
// without a pause (the sweep runs left to right, like the rise).
function shimmerNameAfter(delay, name, chars, stillShown) {
  name._shimmerDelay?.kill();
  name._shimmerDelay = gsap.delayedCall(delay, () => stillShown() && shimmerName(name, chars, stillShown));
}

// Sinking "Olena Bosoi" (hero on scroll, footer): stop any shimmer and ease the
// letters back to the lightest weight, so it leaves as muted as it came.
function restName(name, chars) {
  name._shimmerDelay?.kill();
  name._shimmer?.kill();
  if (noShimmer(name)) return;
  const { min } = nameWeights(name);
  gsap.to(chars, { "--wght": min, duration: 0.4, ease: "power2.out", overwrite: "auto" });
}

// Hero intro. Plays the moment the loader starts sliding away:
// 1. both text columns reveal line by line, side by side on the centre line;
// 2. they spread apart (left up, right down; not on phones) while "Olena Bosoi" rises letter by letter;
// 3. the navigation fades down.
function createHeroIntro(hero) {
  const startBlock = hero.querySelector('[data-hero-content="start"]');
  const endBlock = hero.querySelector('[data-hero-content="end"]');
  const name = hero.querySelector("[data-hero-name]");
  const nav = document.querySelector("[data-intro-nav]");

  const startSplit = SplitText.create(startBlock.querySelectorAll("[data-hero-split]"), { type: "lines", mask: "lines" });
  const endSplit = SplitText.create(endBlock.querySelectorAll("[data-hero-split]"), { type: "lines", mask: "lines" });
  // Variable Font Weight Hover (Osmo) keeps the name split into letters for good;
  // reuse its letters instead of splitting a second time. On touch screens it
  // doesn't run, so the intro splits the name itself, the same way and for good:
  // the shimmer needs the .char letters (main.css) and outlasts the intro.
  const nameSplit = name.fontWeightHoverSplit ||
    (name.fontWeightHoverSplit = SplitText.create(name, { type: "chars", charsClass: "char" }));

  const lineReveal = { yPercent: 110, duration: 1, stagger: 0.1, ease: "power3.out" };
  const spreadDuration = 1.4;
  const charDuration = 0.9;
  // Name and navigation share one motion: same start, ease and end.
  const nameEase = "expo.out";

  const tl = gsap.timeline({
    onComplete: () => {
      [startSplit, endSplit].forEach((split) => split.revert());
      gsap.set([startBlock, endBlock], { clearProps: "transform" });
      document.documentElement.classList.remove("is-intro");
    },
  });

  // Phones have no spread: both blocks already sit side by side above the name (see main.css).
  const spreads = !window.matchMedia("(max-width: 767px)").matches;

  tl.set([startBlock, endBlock, name], { autoAlpha: 1 });
  // The weight hover waits until the name has risen and the shimmer is done (below).
  tl.call(() => name.setAttribute("data-font-weight-hover-paused", ""), null, 0);

  // Start with both blocks centred on the same line: replace the CSS offset
  // (translateY ±50%) with no offset; the spread animates it back.
  if (spreads) {
    tl.set([startBlock, endBlock], { y: 0, yPercent: 0 });
  }

  tl.from(startSplit.lines, lineReveal, 0)
    .from(endSplit.lines, lineReveal, 0);

  // Spread once the lines are (almost) fully in.
  tl.addLabel("spread", "-=0.5");

  if (spreads) {
    tl.to(startBlock, { yPercent: -50, duration: spreadDuration, ease: "osmo" }, "spread")
      .to(endBlock, { yPercent: 50, duration: spreadDuration, ease: "osmo" }, "spread");
  }

  // The name sits on the section's bottom edge, so the section clips the letters until they rise.
  tl.from(nameSplit.chars, {
      yPercent: 110,
      duration: charDuration,
      ease: nameEase,
      stagger: { amount: spreadDuration - charDuration },
    }, "spread");
  // The shimmer follows the rise once the first letters are about up.
  tl.call(() => shimmerName(name, nameSplit.chars, () => !name.hasAttribute("data-hero-name-hidden")), null, "spread+=0.5");

  if (nav) {
    // Fade the bar background and the bar content, never the nav wrapper itself:
    // opacity below 1 on an ancestor cuts backdrop-filter off from the page,
    // so the bar would only start blurring once the fade had finished.
    const navFade = nav.querySelectorAll(".twostep-nav__back-bg, .twostep-nav__top");
    const navMotion = { duration: spreadDuration, ease: nameEase };

    tl.set(nav, { visibility: "visible" }, "spread")
      .fromTo(nav, { yPercent: -100 }, { ...navMotion, yPercent: 0, clearProps: "transform" }, "spread")
      .fromTo(navFade, { opacity: 0 }, { ...navMotion, opacity: 1, clearProps: "opacity" }, "spread");
  }

  return tl;
}

// "Olena Bosoi" on scroll. On load the name is always in view, whatever the
// scroll position. The first scroll the visitor makes, by even a pixel, makes
// the letters ease to their lightest weight and sink below the card's bottom
// edge (the intro rise, reversed). Scrolling back up to the top they rise again, a little
// quicker than in the intro, and the weight hover takes over again.
function initHeroNameScroll() {
  const hero = document.querySelector("[data-hero]");
  const name = hero && hero.querySelector("[data-hero-name]");
  if (!name) return;

  // The weight hover keeps the name split into letters; on touch screens it
  // doesn't run, so split here on first use.
  const getChars = () =>
    (name.fontWeightHoverSplit || (name.fontWeightHoverSplit = SplitText.create(name, { type: "chars", charsClass: "char" }))).chars;

  let hidden = false;

  const hide = () => {
    if (hidden) return;
    hidden = true;
    const chars = getChars();
    name.setAttribute("data-hero-name-hidden", "");
    name.setAttribute("data-font-weight-hover-paused", "");
    restName(name, chars);
    gsap.to(chars, {
      yPercent: 110,
      duration: 0.6,
      ease: "power3.in",
      stagger: { amount: 0.3 },
      overwrite: "auto",
    });
  };

  // The rise from createHeroIntro, quicker: coming back should feel immediate.
  const show = () => {
    if (!hidden) return;
    hidden = false;
    const chars = getChars();
    name.removeAttribute("data-hero-name-hidden");
    gsap.to(chars, {
      yPercent: 0,
      duration: 0.6,
      ease: "expo.out",
      stagger: { amount: 0.25 },
      overwrite: "auto",
    });
    shimmerNameAfter(0.25, name, chars, () => !hidden);
  };

  // Only scrolling the visitor does counts: the browser restoring the scroll
  // position on reload also fires scroll events, and must not hide the name.
  // Any input that can scroll (wheel, touch, keys, dragging the scrollbar) arms it.
  let armed = false;
  const arm = () => { armed = true; };
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) =>
    window.addEventListener(type, arm, { passive: true })
  );

  // Back up near the top (the top tenth of a screen) the name returns without
  // waiting for the smooth scroll's slow last stretch to exactly 0. Any move
  // down, or being further down, hides it.
  // (Direction from the previous position: Lenis' own can lag behind a jump.)
  let lastScroll = window.scrollY;
  lenis.on("scroll", ({ scroll }) => {
    const goingUp = scroll < lastScroll;
    lastScroll = scroll;
    if (!armed) return;
    const nearTop = scroll < window.innerHeight * 0.1;
    if (scroll < 1 || (nearTop && goingUp)) show();
    else hide();
  });
}

// Work: the three niches share one pinned block, after the "other amazing
// entries" block on codetv-gsap-cloud.webflow.io. The ring closes in, then the
// block pins and the three batches of banners pass one after another, right to
// left across the middle of the screen. Each card arcs up or down (alternating)
// around the title and back, tilts from a random angle to its mirror, and
// swells in the middle. One ring fills across all three batches; the title in
// its centre and the dots above it change between them, and the share of the
// ring filled shows under it. Narrow screens and reduced motion get three
// plain CSS carousels instead (main.css).
function initWorkRunners() {
  const runner = document.querySelector("[data-work-combined]");
  if (!runner) return;

  gsap.matchMedia().add("(min-width: 881px) and (prefers-reduced-motion: no-preference)", () => {
    const viewport = runner.querySelector("[data-work-runner-viewport]");
    const batches = [...runner.querySelectorAll("[data-work-combined-batch]")];
    const progressFill = runner.querySelector("[data-work-runner-progress]");
    const ring = runner.querySelector("[data-work-runner-ring]");
    const ringShapes = runner.querySelectorAll("[data-work-runner-ring-shape]");
    const ringDisc = runner.querySelector("[data-work-runner-disc]");
    const dots = [...runner.querySelectorAll("[data-work-combined-dot]")];
    const percent = runner.querySelector("[data-work-combined-percent]");
    if (!viewport || !batches.length) return;

    const lists = batches.map((batch) => batch.querySelector("[data-work-combined-cards]"));
    const titles = batches.map((batch) => batch.querySelector("[data-work-combined-title]"));

    // Each row travels its full width plus a screen: its first card comes in
    // at the right edge and its last leaves at the left (the 105vw padding).
    const distance = (list) => list.scrollWidth - window.innerWidth;
    const offset = (index) => lists.slice(0, index).reduce((sum, list) => sum + distance(list), 0);
    const total = () => offset(lists.length);

    // The ring's circle is one unit long (pathLength="1"), so the offset is a
    // fraction. Set directly: gsap.set would round it to whole pixels.
    // The percentage under the title follows it.
    // Once the ring is full it bounces, and three copies of its line spread
    // out from it one after another, fading, like rings on water. Again
    // after it has emptied a little (scrolling back up).
    const ripples = gsap.utils.toArray("[data-work-runner-ripple]", runner);
    let full = false;
    const setProgress = (progress) => {
      if (progressFill) progressFill.style.strokeDashoffset = 1 - progress;
      if (percent) percent.textContent = Math.round(progress * 100) + "%";
      if (progress >= 0.995 && !full) {
        full = true;
        bounce();
        gsap.fromTo(ripples, { scale: 1, opacity: 0.6 }, {
          scale: (index) => 2 + index * 0.75,
          opacity: 0,
          duration: 2,
          ease: "power2.out",
          stagger: 0.18,
          overwrite: true,
        });
      } else if (progress < 0.98) {
        full = false;
      }
    };

    // Title and dots: only the current batch's are shown; the others wait
    // below their masks. A change rolls the old title out line by line and the
    // new one in, each line through its own mask (as the Osmo Masked Text
    // Reveal), and the dots above it move on. autoSplit re-splits the
    // titles once the fonts load or the width changes; each split starts in
    // the current state.
    let current = 0;
    const titleLines = [];
    titles.forEach((title, index) => SplitText.create(title, {
      type: "lines",
      mask: "lines",
      autoSplit: true,
      onSplit: (self) => {
        titleLines[index] = self.lines;
        gsap.set(self.lines, { yPercent: index === current ? 0 : 110 });
      },
    }));
    // The ring's bounce: the ring, disc and all, with a brief flash of the
    // disc: it fills to 50% accent over its blurred surface, and fades back.
    // The ring line flashes from the text colour to the accent and fades back,
    // timed as the elastic lines' flash.
    const bounce = () => {
      if (ring) {
        pulse(ring);
        gsap.timeline()
          .fromTo(ring, { "--ring-flash": "0%" }, { "--ring-flash": "100%", duration: 0.1, ease: "power2.out", overwrite: "auto" })
          .to(ring, { "--ring-flash": "0%", duration: 0.8, ease: "power2.out" });
      }
      // Eased in and out both ways: it brightens softly, then fades softly.
      if (ringDisc) {
        gsap.timeline()
          .fromTo(ringDisc, { "--disc-light": "0%" }, { "--disc-light": "50%", duration: 0.4, ease: "sine.inOut", overwrite: "auto" })
          .to(ringDisc, { "--disc-light": "0%", duration: 0.8, ease: "sine.inOut" });
      }
    };
    const show = (next) => {
      if (next === current) return;
      const down = next > current;
      const swap = (items) => {
        // Moving on, the old title drops out downwards and the new one comes
        // in from above; going back, the other way round.
        gsap.to(items[current], { yPercent: down ? 110 : -110, duration: 0.5, stagger: 0.08, ease: "power3.in", overwrite: true });
        gsap.fromTo(items[next], { yPercent: down ? -110 : 110 }, { yPercent: 0, duration: 0.8, stagger: 0.08, delay: 0.4, ease: "expo.out", overwrite: true });
      };
      swap(titleLines);
      dots.forEach((dot, index) => dot.classList.toggle("is--active", index === next));
      // The ring bounces at each switch, as when it lands.
      bounce();
      current = next;
    };
    const batchAt = (scrolled) => {
      let index = 0;
      while (index < lists.length - 1 && scrolled >= offset(index + 1)) index++;
      return index;
    };

    // The pin, for all three rows together.
    const pin = ScrollTrigger.create({
      trigger: viewport,
      pin: true,
      pinType: "fixed",
      start: "top top",
      end: () => "+=" + total(),
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        setProgress(self.progress);
        show(batchAt(self.progress * total()));
      },
      // The ring lands with a bounce as the block pins and starts filling.
      onEnter: bounce,
    });

    // One row per batch, each scrubbed over its own stretch of the pin.
    const slides = lists.map((list, index) => gsap.fromTo(list, { x: 0 }, {
      x: () => -distance(list),
      ease: "none",
      scrollTrigger: {
        trigger: runner,
        start: () => "top top-=" + offset(index),
        end: () => "top top-=" + offset(index + 1),
        scrub: true,
        invalidateOnRefresh: true,
      },
    }));

    // On the way in the ring closes in: it starts as a circle as tall as the
    // screen and shrinks to its own size until the block pins. Its radius is
    // redrawn rather than scaled, so the line keeps its width. It tilts back
    // upright meanwhile (perspective from the title block, see main.css), and
    // the blurred disc inside rounds from a screen-sized square with slightly
    // rounded corners into a circle, turning a quarter round and dimming from
    // a lighter start.
    if (ringShapes.length) {
      const radius = Number(ringShapes[0].getAttribute("rx"));
      const screenRadius = () => window.innerHeight / 2;
      const approach = { trigger: runner, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true };
      gsap.fromTo(ringShapes, { attr: { rx: screenRadius, ry: screenRadius } }, {
        attr: { rx: radius, ry: radius },
        ease: "none",
        scrollTrigger: approach,
      });
      if (ring) {
        gsap.fromTo(ring, { rotationX: 30 }, { rotationX: 0, ease: "none", scrollTrigger: { ...approach } });
      }
      if (ringDisc) {
        const screenSize = () => window.innerHeight + "px";
        const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize);
        const fillInset = () => parseFloat(getComputedStyle(ringDisc, "::before").top);
        const startRadius = () => 0.5 * rem() + "px"; // --radius-sm
        const endRadius = () => ringDisc.parentElement.offsetWidth / 2 - fillInset() + "px";
        gsap.set(ringDisc, { x: 0, y: 0, xPercent: -50, yPercent: -50 });
        gsap.fromTo(ringDisc, { width: screenSize, height: screenSize, "--disc-radius": startRadius, "--disc-light": "22%", rotation: -90 }, {
          rotation: 0,
          "--disc-light": "0%",
          width: "100%",
          height: "100%",
          "--disc-radius": endRadius,
          ease: "none",
          scrollTrigger: { ...approach },
        });
      }
    }

    // Each card arcs around the title and back, tilts from a random angle to
    // its mirror and swells to 1.3x in the middle.
    lists.forEach((list, listIndex) => {
      list.querySelectorAll("[data-work-card]").forEach((card, index) => {
        const side = index % 2 === 0 ? 1 : -1;
        const tilt = (Math.random() - 0.5) * 6;
        const pass = {
          trigger: card,
          containerAnimation: slides[listIndex],
          start: "left 90%",
          end: "right 10%",
          scrub: true,
        };
        gsap.fromTo(card, { rotation: tilt }, {
          rotation: -tilt,
          y: () => side * -0.4 * (window.innerHeight - 100),
          yPercent: side * 18,
          yoyo: true,
          repeat: 1,
          ease: "power1.inOut",
          scrollTrigger: pass,
        });
        gsap.to(card, {
          scale: 1.3,
          yoyo: true,
          repeat: 1,
          ease: "back.inOut(3)",
          scrollTrigger: { ...pass },
        });
      });
    });

    // Loading the page already scrolled into the block: each row is set to its
    // spot before the cards exist, and the cards only follow the row when it
    // moves. Play each row back from the start once so they catch up.
    slides.forEach((slide) => {
      const progress = slide.progress();
      slide.progress(0).progress(progress);
    });
    setProgress(pin.progress);
    const start = batchAt(pin.progress * total());
    if (start) {
      titleLines.forEach((lines, index) => gsap.set(lines, { yPercent: index === start ? 0 : 110 }));
      dots.forEach((dot, index) => dot.classList.toggle("is--active", index === start));
      current = start;
    }

    // Triggers made earlier (the headings' colour wave, by its Osmo script) sit below
    // this pin: refresh them in page order so they count the pinned length.
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  });
}

// Work, last block ("And more"): a grid of ten banners, five per row (two on
// phones), opens out of one large banner. Once the block's top is 60% down
// the screen, scrolling on spreads the others out from behind it into their
// places; they hold there a moment, and as the pin lets go they fall
// together, along curves, into a pile behind the About card as it comes up
// (main.css puts the card above).
// All of it is scrubbed by the scroll and smoothed, so a fast scroll doesn't
// snap it; like the hero, the block holds still (pinned) while the cards fly in.
function initWorkMore() {
  const block = document.querySelector("[data-work-more]");
  const inner = block && block.querySelector("[data-work-more-inner]");
  const grid = block && block.querySelector("[data-work-more-grid]");
  const title = block && block.querySelector("[data-gradient-wave-text]");
  if (!inner || !grid || !title) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = gsap.utils.toArray("[data-work-more-card]", grid);
  const aboutCard = document.querySelector(".about__card");

  let tl, pin, drop;
  const build = () => {
    if (drop) {
      drop.scrollTrigger.kill();
      drop.kill();
      drop = null;
    }
    if (tl) {
      tl.scrollTrigger.kill();
      tl.kill();
      tl = null;
    }
    if (pin) {
      pin.kill(true); // true: also undo the pin
      pin = null;
    }
    // Drop everything a previous build left inline.
    gsap.set(cards, { clearProps: "all" });
    gsap.set(grid, { clearProps: "transform,transformOrigin" });
    // Narrow screens show the banners as a swiped row instead (main.css): no pile.
    if (window.matchMedia("(max-width: 880px)").matches) return;

    // Each card's centre in the grid, where it stands in the flow.
    const centre = (card) => {
      const box = card.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    };
    const inGrid = cards.map(centre);
    const gridBox = grid.getBoundingClientRect();
    // Measure the pile: each card at the top centre, with its own small shift
    // (its tilt is added below, as it doesn't move the centre).
    // Hold the grid's height meanwhile: with every card taken out of the flow
    // it would collapse, and its centre would jump to the top edge.
    grid.style.height = grid.offsetHeight + "px";
    grid.classList.add("is--pile");
    cards.forEach((card) => {
      gsap.set(card, {
        xPercent: -50,
        x: gsap.utils.random(-40, 40),
        y: gsap.utils.random(-30, 30),
      });
    });
    const inPile = cards.map(centre);
    // Where the pile sits (its cards' average centre), from the block's centre,
    // for the fall below.
    const innerBox = inner.getBoundingClientRect();
    const pileCentre = inPile.reduce((sum, point) => sum + point.y, 0) / cards.length;
    const pileOffset = pileCentre - (innerBox.top + innerBox.height / 2);

    // Back to the grid. The pile is then reached with transforms alone: each
    // card moves from its grid place by the distance to its place in the pile.
    grid.classList.remove("is--pile");
    grid.style.height = "";
    gsap.set(cards, { clearProps: "all" });
    const toPile = cards.map((card, i) => ({
      x: inPile[i].x - inGrid[i].x,
      y: inPile[i].y - inGrid[i].y,
      rotation: gsap.utils.random(-14, 14),
    }));
    // The grid opens out of one banner (after grid-scroll.learnframer.site).
    // The centre column's top banner starts on the grid's centre at nearly
    // twice its size; every other one starts hidden behind it, pulled in
    // towards the centre (sideways all the way, up and down most of it), small
    // (the further out, the smaller) and clear. Then they all open out
    // together, fading in, as it shrinks into its place.
    const half = gridBox.width / 2;
    const gridMiddle = gridBox.left + half;
    const gridCentreY = gridBox.top + gridBox.height / 2;
    const scattered = cards.map((card, i) => {
      const far = Math.abs((inGrid[i].x - gridMiddle) / half); // 0 (centre) to 1 (edge)
      const hero = far < 0.1 && !card.previousElementSibling;
      if (hero) gsap.set(card, { zIndex: 2 });
      return hero
        ? { x: 0, y: gridCentreY - inGrid[i].y, scale: 1.8, opacity: 1 }
        : {
            x: (gridMiddle - inGrid[i].x) * 0.95,
            y: (gridCentreY - inGrid[i].y) * 0.75,
            scale: 0.7 - far * 0.2,
            opacity: 0,
          };
    });

    // Pin the title and grid only when they fit on screen; on phones they're
    // taller, so they scroll on over a longer stretch instead.
    // The banners start settling well before the pin, once the block's top is
    // 60% down the screen, so they're already moving when the block locks.
    // That lead, in screens: from there until the block is centred.
    const fits = inner.offsetHeight <= window.innerHeight;
    const lead = 0.1 + inner.offsetHeight / 2 / window.innerHeight;
    // Pinned length, in screens: the settle into the grid, then a short hold
    // there. The fall into the pile comes after the pin, as the page moves on.
    const settleScreens = 0.8;
    const holdScreens = 0.25;
    const pinScreens = fits ? settleScreens + holdScreens : 0;
    if (fits) {
      pin = ScrollTrigger.create({
        trigger: inner,
        start: "center center",
        end: () => "+=" + window.innerHeight * pinScreens,
        pin: true,
      });
    }
    tl = gsap.timeline({
      scrollTrigger: fits
        ? {
            trigger: inner,
            start: "top 60%",
            end: () => pin.end,
            scrub: 0.25,
          }
        : {
            trigger: title,
            start: "center 60%",
            endTrigger: grid,
            end: "bottom bottom",
            scrub: 0.25,
          },
    });
    // Out from behind the large banner into their grid places.
    // Durations are in screens of scroll; the scrub maps them onto the page.
    const settleLength = settleScreens + lead;
    tl.fromTo(
      cards,
      {
        x: (i) => scattered[i].x,
        y: (i) => scattered[i].y,
        scale: (i) => scattered[i].scale,
        opacity: (i) => scattered[i].opacity,
      },
      {
        x: 0,
        y: 0,
        scale: 1,
        opacity: 1,
        ease: "power2.inOut",
        duration: settleLength * 0.8,
      }
    );
    if (!fits) return;
    tl.to({}, { duration: holdScreens });

    // Then, once the pin lets go, the cards fall together into a pile behind
    // the About card as it comes up: one motion from the grid to the pile,
    // ending as the card's centre reaches the screen's centre. Each card drifts
    // sideways to the centre early (sine.out) and drops late (sine.in), so it
    // falls along a curve, first carried up with the page, then down; each
    // starts at its own moment, in a random order. Their way down takes them
    // the scroll's length plus a little, so the pile ends a little below the
    // screen's centre, covered by the card (main.css puts it above).
    if (!aboutCard) return;
    const sinkFurther = 0.12;
    // The scroll the fall lasts: from the pin's end to the card's centre on the
    // screen's centre (the "center center" end below).
    const sinkLength = () => {
      const box = aboutCard.getBoundingClientRect();
      return box.top + window.scrollY + box.height / 2 - window.innerHeight / 2 - pin.end;
    };
    drop = gsap.timeline({
      scrollTrigger: {
        trigger: aboutCard,
        start: () => pin.end,
        end: "center center",
        scrub: 0.25,
        invalidateOnRefresh: true,
      },
    });
    const fallStart = cards.map(() => gsap.utils.random(0, 0.3));
    cards.forEach((card, i) => {
      // From the grid place, stated outright: the cards start this timeline
      // scattered, and it mustn't take that for its start.
      drop
        .fromTo(card, { x: 0, rotation: 0, scale: 1 }, {
          x: toPile[i].x,
          rotation: toPile[i].rotation,
          scale: 0.85,
          ease: "sine.out",
          duration: 1,
          immediateRender: false,
        }, fallStart[i])
        .fromTo(card, { y: 0 }, {
          y: () => toPile[i].y + sinkLength() - pileOffset + window.innerHeight * sinkFurther,
          ease: "sine.in",
          duration: 1,
          immediateRender: false,
        }, fallStart[i]);
    });
  };

  build();
  // Triggers made earlier further down the page (by the Osmo scripts) don't
  // know about this pin yet: refresh them in page order so they count its
  // length, or they fire a screen too early.
  ScrollTrigger.sort();
  ScrollTrigger.refresh();

  let resizeTimer;
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      ScrollTrigger.refresh();
    }, 200);
  });
}

// The landing bounce of Osmo's Stacking Sticky Cards: a quick stretch sideways,
// then an elastic settle back to its own size.
function pulse(el) {
  const stretch = 1.5 * parseFloat(getComputedStyle(el).fontSize);
  gsap.timeline()
    .to(el, {
      scaleX: (el.offsetWidth + stretch) / el.offsetWidth,
      scaleY: (el.offsetHeight - stretch * 0.33) / el.offsetHeight,
      duration: 0.1,
      ease: "power1.out",
      overwrite: "auto",
    })
    .to(el, { scaleX: 1, scaleY: 1, duration: 1, ease: "elastic.out(1, 0.3)" });
}

// About: the photo grows into the card as it scrolls in. It starts smaller
// (0.85) and grows to full size while the card's top edge comes up to the
// middle of the screen (accelerating), then lands with a squash
// and a springy bounce (pulse, as on the Work ring). Lands again each time the
// drop is scrolled through downwards.
function initAboutPhotoDrop() {
  const card = document.querySelector(".about__card");
  const photo = card && card.querySelector(".about__media");
  if (!photo || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Grows from its bottom edge, where it squashes on landing.
  gsap.set(photo, { transformOrigin: "50% 100%" });
  gsap.fromTo(photo, { scale: 0.85 }, {
    scale: 1,
    ease: "power2.in",
    scrollTrigger: {
      trigger: card,
      start: "top bottom",
      end: "top 50%",
      scrub: 0.3,
      onLeave: () => pulse(photo),
    },
  });
}

function initPageIntro() {
  const root = document.documentElement;
  if (!root.classList.contains("is-intro")) return;

  const hero = document.querySelector("[data-hero]");
  const loader = document.querySelector("[data-loading-container]");

  // The browser may have restored a scroll position after all.
  if (!hero || !loader || window.scrollY > 0) {
    root.classList.remove("is-intro", "is-loading");
    return;
  }

  window.introStarted = true;
  // html.is-loading blocks native scroll; Lenis scrolls by script, so pause it too.
  lenis.stop();

  // Start once the card photos are in (they come from a CDN), or the cards would
  // stack and fall empty over the black screen. Never wait more than 1.5s for them.
  const photos = [...loader.querySelectorAll("[data-loading-card] img")];
  const photosIn = Promise.all(photos.map((img) => img.decode().catch(() => {})));
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  Promise.race([photosIn, timeout]).then(() => playLoader(root, hero, loader));
}

function playLoader(root, hero, loader) {
  // Fill the progress bar from wherever its CSS animation got to, over the
  // cards' stack-in, so it reads full just before they fall.
  const progress = loader.querySelector("[data-loading-progress]");
  if (progress) {
    const filled = gsap.getProperty(progress, "scaleX");
    progress.style.animation = "none";
    gsap.fromTo(progress, { scaleX: filled }, { scaleX: 1, duration: 1.1, ease: "power2.inOut" });
  }

  const loaderTl = initDroppingCardsLoadingAnimation();
  const background = loader.querySelector("[data-loading-background]");
  const backgroundTween = loaderTl
    .getChildren(false, true, false)
    .find((tween) => tween.targets().includes(background));
  // The loader covers the hero until its background has mostly slid away. With the
  // "osmo" ease that is ~40% into the tween (about two-thirds of the screen is clear),
  // so the text starts revealing as it comes into view, not behind the loader.
  const revealAt = 0.4;
  const heroStart = backgroundTween
    ? backgroundTween.startTime() + backgroundTween.duration() * revealAt
    : loaderTl.duration();

  // Fonts must be in before the text is split into lines.
  loaderTl.call(() => {
    document.fonts.ready.then(() => createHeroIntro(hero));
  }, null, heroStart);

  loaderTl.eventCallback("onComplete", () => {
    gsap.set(loader, { display: "none" });
    root.classList.remove("is-loading");
    lenis.start();
  });
}

// The hero photo grows as the hero scrolls away: 1 at the top, 1.2 once the
// hero is off screen. The image, not .hero__media: the loader animates that.
function initHeroImageScroll() {
  const hero = document.querySelector("[data-hero]");
  const img = hero && hero.querySelector(".hero__img");
  if (!img || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  gsap.fromTo(img, { scale: 1 }, {
    scale: 1.2,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
  });
}

// "Olena Bosoi" in the footer, set like the hero name. It waits below the page
// edge (the footer clips it) and rises letter by letter, as in the hero intro,
// once it starts coming into view, a shimmer runs through it, and the weight
// hover takes over from the next cursor move.
// Scrolling back up sinks it again (the hero name's hide).
function initFooterName() {
  const footer = document.querySelector("[data-footer]");
  const name = footer && footer.querySelector("[data-footer-name]");
  if (!name) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    name.removeAttribute("data-font-weight-hover-paused");
    return;
  }

  // The weight hover keeps the name split into letters; on touch screens it
  // doesn't run, so split here.
  const chars = (name.fontWeightHoverSplit ||
    (name.fontWeightHoverSplit = SplitText.create(name, { type: "chars", charsClass: "char" }))).chars;
  gsap.set(chars, { yPercent: 110 });

  let shown = false;
  const show = () => {
    shown = true;
    gsap.to(chars, {
      yPercent: 0,
      duration: 0.9,
      ease: "expo.out",
      stagger: { amount: 0.5 },
      overwrite: "auto",
    });
    shimmerNameAfter(0.4, name, chars, () => shown);
  };
  const hide = () => {
    shown = false;
    name.setAttribute("data-font-weight-hover-paused", "");
    restName(name, chars);
    gsap.to(chars, {
      yPercent: 110,
      duration: 0.6,
      ease: "power3.in",
      stagger: { amount: 0.3 },
      overwrite: "auto",
    });
  };

  ScrollTrigger.create({
    trigger: name,
    start: "top 95%",
    onEnter: show,
    onLeaveBack: hide,
  });
}

// Clients marquee: a logo plate bounces when the cursor comes onto it, as the
// Work banners (Osmo Elastic Pulse, same stretch and spring). Listened for on
// the marquee, not each plate: the marquee rebuilds its copies of the plates.
function initLogoPulse() {
  if (window.matchMedia("(hover: none) and (pointer: coarse)").matches) return;
  document.querySelectorAll("[data-wavy-marquee-init]").forEach((marquee) => {
    marquee.addEventListener("mouseover", (event) => {
      const card = event.target.closest(".logo-card");
      if (!card || card.contains(event.relatedTarget) || card._pulseLocked) return;
      card._pulseLocked = true;
      setTimeout(() => { card._pulseLocked = false; }, 500);
      const stretch = 0.75 * parseFloat(getComputedStyle(card).fontSize);
      gsap.timeline()
        .to(card, {
          scaleX: (card.offsetWidth + stretch) / card.offsetWidth,
          scaleY: (card.offsetHeight - stretch * 0.33) / card.offsetHeight,
          duration: 0.1,
          ease: "power1.out",
          overwrite: "auto",
        })
        .to(card, { scaleX: 1, scaleY: 1, duration: 1, ease: "elastic.out(1, 0.3)" });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initLenis();
  initScrollMemory();
  initPageIntro();
  initHeroImageScroll();
  initHeroNameScroll();
  initWorkRunners();
  initWorkMore();
  initAboutPhotoDrop();
  initFooterName();
  initLogoPulse();
  restoreScroll();
});
