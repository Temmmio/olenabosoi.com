// Osmo resource from the Osmo library (Basic Custom Cursor), copied verbatim.
function initBasicCustomCursor() {  
  
  gsap.set(".cursor", {xPercent:-50, yPercent: -50});

  let xTo = gsap.quickTo(".cursor", "x", {duration: 0.6, ease: "power3"});
  let yTo = gsap.quickTo(".cursor", "y", {duration: 0.6, ease: "power3"});

  window.addEventListener("mousemove", e => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
}

// Initialize Basic Custom Cursor
document.addEventListener('DOMContentLoaded', () => {
  initBasicCustomCursor();
});
