// Osmo resource from Osmo Supply (Gradient Wave Text on Scroll).
// Site changes, marked below: [data-gradient-wave-pinned-container] (a selector)
// names the pinned block the heading sits in, so its scroll range is measured
// right even when the page loads with that block already pinned; a colour
// attribute may name a CSS variable ("--accent"), read from the heading; and
// with no start colour given, the letters start as the heading's own colour
// at 20% (Osmo: always white at 20%).
gsap.registerPlugin(ScrollTrigger, SplitText);

function initGradientWaveText() {
  document.querySelectorAll('[data-gradient-wave-text]').forEach((heading) => {
    const scrollStart = heading.getAttribute('data-gradient-wave-scroll-start') || 'top 90%';
    const scrollEnd = heading.getAttribute('data-gradient-wave-scroll-end') || 'center 40%';
    // Site change: "--name" reads that CSS variable (see the note at the top).
    const cssColor = (value) => value && value.startsWith('--') ? getComputedStyle(heading).getPropertyValue(value).trim() : value;
    const waveColor = cssColor(heading.getAttribute('data-gradient-wave-color-wave')) || '#F84131';
    const waveDuration = parseFloat(heading.getAttribute('data-gradient-wave-duration')) || 0.4;
    const scrubValue = parseFloat(heading.getAttribute('data-gradient-wave-scrub')) || 0.1;
    const endColor = getComputedStyle(heading).color;
    // Site change: the default start colour follows the heading's colour.
    const faint = (color) => {
      const [r, g, b] = color.match(/[\d.]+/g).map(Number);
      const scale = color.startsWith('color(') ? 255 : 1;
      return `rgba(${r * scale}, ${g * scale}, ${b * scale}, 0.2)`;
    };
    const startColor = cssColor(heading.getAttribute('data-gradient-wave-color-start')) || faint(endColor);

    new SplitText(heading, {
      type: 'words, chars',
      autoSplit: true,
      onSplit(self) {
        const chars = self.chars;
        const activeChars = new Set();
        const progress = { value: 0 };
        let isReady = false;

        const syncChars = () => {
          const activeCount = Math.round(progress.value * chars.length);

          chars.forEach((char, index) => {
            const isActive = index < activeCount;
            gsap.killTweensOf(char);
            gsap.set(char, {color: isActive ? endColor : startColor});
            if (isActive) activeChars.add(char);
            else activeChars.delete(char);
          });
        };

        const ctx = gsap.context(() => {
          gsap.set(chars, {color: startColor});

          gsap.to(progress, {
            value: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: heading,
              // Site change: see the note at the top.
              pinnedContainer: heading.closest(heading.getAttribute('data-gradient-wave-pinned-container')) || undefined,
              start: scrollStart,
              end: scrollEnd,
              scrub: scrubValue,
              onRefresh: () => {
                isReady = false;
                syncChars();
                requestAnimationFrame(() => {
                  isReady = true;
                });
              }
            },
            onUpdate: () => {
              if (!isReady) return;

              const activeCount = Math.round(progress.value * chars.length);
              chars.forEach((char, index) => {
                const isActive = index < activeCount;

                if (isActive && !activeChars.has(char)) {
                  activeChars.add(char);
                  gsap.killTweensOf(char);

                  gsap.timeline()
                    .to(char, {
                      color: waveColor,
                      duration: waveDuration * 0.3,
                      ease: 'power2.out'
                    })
                    .to(char, {
                      color: endColor,
                      duration: waveDuration * 0.7,
                      ease: 'power2.in'
                    });
                }

                if (!isActive && activeChars.has(char)) {
                  activeChars.delete(char);
                  gsap.killTweensOf(char);

                  gsap.to(char, {
                    color: startColor,
                    duration: waveDuration * 0.5,
                    ease: 'none'
                  });
                }
              });
            }
          });
        }, heading);

        return ctx;
      }
    });
  });
}

// Initialize Gradient Wave Text on Scroll
document.addEventListener('DOMContentLoaded', () => {
  initGradientWaveText();
});
