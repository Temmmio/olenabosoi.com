// Osmo resource, copied verbatim from the Osmo library.
function initTwostepScalingNavigation() {
  const navElement = document.querySelector("[data-twostep-nav]")
  const navStatusEl = document.querySelector("[data-nav-status]");
  
  if (!navElement || !navStatusEl) return;
  
  const setNavStatus = (status) => {
    navStatusEl.setAttribute("data-nav-status", status);
  };

  const isActive = () => navStatusEl.getAttribute("data-nav-status") === "active";

  const openNav = () => {
    setNavStatus("active");
    // If you use Lenis, you could pause the scroll here:
    // Lenis.stop?.();
  };

  const closeNav = () => {
    setNavStatus("not-active");
    // If you use Lenis, you could resume scroll here:
    // Lenis.start?.();
  };

  const toggleNav = () => (isActive() ? closeNav() : openNav());

  // Toggle buttons
  document.querySelectorAll('[data-nav-toggle="toggle"]').forEach((btn) => {
    btn.addEventListener("click", toggleNav);
  });

  // Close buttons
  document.querySelectorAll('[data-nav-toggle="close"]').forEach((btn) => {
    btn.addEventListener("click", closeNav);
  });

  // ESC closes
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isActive()) closeNav();
  });
}

// Initialize Two-step Scaling Navigation
document.addEventListener("DOMContentLoaded", () => {
  initTwostepScalingNavigation();
});
