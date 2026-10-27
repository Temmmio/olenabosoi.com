// Osmo resource from the Osmo library (Click to Zoom (Basic)).
// One site change, marked below: the zoom keeps the image's own proportions,
// since the banners it opens from can be rotated and scaled by the Work animation.
function initClickToZoomBasic() {

  const CONFIG = {
    openDuration: 0.55,
    closeDuration: 0.45,
    openEase: "power3.out",
    closeEase: "power2.inOut",

    closeOnScroll: true,
    closeOnEscape: true,
    closeOnClick: true,
  };

  const lightbox = document.querySelector("[data-click-zoom-lightbox]");
  if (!lightbox) return;

  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-hidden", "true");

  // Backdrop animates from transparent to the CSS-declared color.
  const backdropColor = window.getComputedStyle(lightbox).backgroundColor;
  const transparent = "rgba(0, 0, 0, 0)";

  let cloneEl = null;
  let isOpen = false;
  let isAnimating = false;
  let openScrollY = 0;
  let openSourceRectDoc = null;

  function computeFlip(src, dst) {
    return {
      scaleX: src.width / dst.width,
      scaleY: src.height / dst.height,
      tx: (src.left + src.width / 2) - (dst.left + dst.width / 2),
      ty: (src.top + src.height / 2) - (dst.top + dst.height / 2),
    };
  }

  function open(img) {
    if (isOpen || isAnimating) return;
    if (!img.complete || !img.naturalWidth) return;

    isAnimating = true;
    openScrollY = window.scrollY;

    const srcRect = img.getBoundingClientRect();
    openSourceRectDoc = {
      top: srcRect.top + window.scrollY,
      left: srcRect.left,
      width: srcRect.width,
      height: srcRect.height,
    };

    cloneEl = img.cloneNode(false);
    cloneEl.loading = "eager";
    cloneEl.removeAttribute("data-click-zoom");

    const srcComputed = window.getComputedStyle(img);

    gsap.set(lightbox, { display: "flex", backgroundColor: transparent });

    const lightboxStyle = window.getComputedStyle(lightbox);
    const padX = parseFloat(lightboxStyle.paddingLeft) + parseFloat(lightboxStyle.paddingRight);
    const padY = parseFloat(lightboxStyle.paddingTop) + parseFloat(lightboxStyle.paddingBottom);
    // Site change: the image's own proportions, not its on-screen box (which a
    // rotated banner makes wider than the image itself).
    const aspect = img.naturalWidth / img.naturalHeight;
    const maxW = lightbox.clientWidth - padX;
    const maxH = lightbox.clientHeight - padY;
    let w = maxW;
    let h = w / aspect;
    if (h > maxH) { h = maxH; w = h * aspect; }

    gsap.set(cloneEl, {
      width: w,
      height: h,
      display: "block",
      objectFit: srcComputed.objectFit,
      objectPosition: srcComputed.objectPosition,
    });

    while (lightbox.firstChild) lightbox.removeChild(lightbox.firstChild);
    lightbox.appendChild(cloneEl);

    const dstRect = cloneEl.getBoundingClientRect();
    const flip = computeFlip(srcRect, dstRect);

    lightbox.setAttribute("aria-hidden", "false");
    document.documentElement.style.cursor = "zoom-out";

    const tl = gsap.timeline({
      onComplete: () => {
        isAnimating = false;
        isOpen = true;
        attachCloseListeners();
      },
    });

    tl.to(lightbox, {
      backgroundColor: backdropColor,
      duration: 0.3,
      ease: "none",
    }, 0);

    tl.fromTo(
      cloneEl,
      { x: flip.tx, y: flip.ty, scaleX: flip.scaleX, scaleY: flip.scaleY },
      { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: CONFIG.openDuration, ease: CONFIG.openEase },
      0
    );
  }

  function close() {
    if (!isOpen || isAnimating) return;
    isAnimating = true;
    detachCloseListeners();
    document.documentElement.style.cursor = "";

    const dstRect = cloneEl.getBoundingClientRect();
    const startX = Number(gsap.getProperty(cloneEl, "x")) || 0;
    const startY = Number(gsap.getProperty(cloneEl, "y")) || 0;
    const startScaleX = Number(gsap.getProperty(cloneEl, "scaleX")) || 1;
    const startScaleY = Number(gsap.getProperty(cloneEl, "scaleY")) || 1;

    function currentSrcRect() {
      return {
        top: openSourceRectDoc.top - window.scrollY,
        left: openSourceRectDoc.left,
        width: openSourceRectDoc.width,
        height: openSourceRectDoc.height,
      };
    }

    let lastFlip = computeFlip(currentSrcRect(), dstRect);

    const cleanup = () => {
      gsap.set(lightbox, { display: "none", clearProps: "backgroundColor" });
      if (cloneEl && cloneEl.parentNode) cloneEl.parentNode.removeChild(cloneEl);
      cloneEl = null;
      lightbox.setAttribute("aria-hidden", "true");
      openSourceRectDoc = null;
      isOpen = false;
      isAnimating = false;
    };

    const state = { t: 0 };

    gsap.to(state, {
      t: 1,
      duration: CONFIG.closeDuration,
      ease: CONFIG.closeEase,
      onUpdate: () => {
        lastFlip = computeFlip(currentSrcRect(), dstRect);
        const t = state.t;
        gsap.set(cloneEl, {
          x: startX + (lastFlip.tx - startX) * t,
          y: startY + (lastFlip.ty - startY) * t,
          scaleX: startScaleX + (lastFlip.scaleX - startScaleX) * t,
          scaleY: startScaleY + (lastFlip.scaleY - startScaleY) * t,
        });
      },
      onComplete: cleanup,
    });

    gsap.to(lightbox, {
      backgroundColor: transparent,
      duration: 0.3,
      ease: "power2.in",
      delay: CONFIG.closeDuration * 0.4,
    });
  }

  function onDocumentClick(e) {
    // Article mode: every descendant <img> in a wrapper is clickable.
    const article = e.target.closest("[data-click-zoom-article]");
    if (article) {
      const img = e.target.closest("img");
      if (img && article.contains(img)) {
        e.preventDefault();
        open(img);
        return;
      }
    }
    // Explicit trigger on the <img> or a wrapper.
    const trigger = e.target.closest("[data-click-zoom]");
    if (!trigger) return;
    const img = trigger.tagName === "IMG" ? trigger : trigger.querySelector("img");
    if (!img) return;
    e.preventDefault();
    open(img);
  }

  function onOverlayClick() { if (CONFIG.closeOnClick) close(); }
  function onKeyDown(e) { if (CONFIG.closeOnEscape && e.key === "Escape") close(); }
  function onScroll() {
    if (!CONFIG.closeOnScroll) return;
    if (Math.abs(window.scrollY - openScrollY) < 2) return;
    close();
  }

  function attachCloseListeners() {
    lightbox.addEventListener("click", onOverlayClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  function detachCloseListeners() {
    lightbox.removeEventListener("click", onOverlayClick);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", onScroll);
  }

  document.addEventListener("click", onDocumentClick);
}


// Initialize Click to Zoom (Basic)
document.addEventListener('DOMContentLoaded', function() {
  initClickToZoomBasic();
});
