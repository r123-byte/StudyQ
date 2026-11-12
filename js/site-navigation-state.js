(function () {
  "use strict";

  const script = document.currentScript;
  const rootPath = script ? new URL("../", script.src).pathname.replace(/\/+$/, "") : "";
  const path = location.pathname.replace(/\/+$/, "");
  const isHome = path === rootPath || path === rootPath + "/index.html";

  document.documentElement.classList.add("site-entry-pending");
  const prefersReducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!prefersReducedMotion && Element.prototype.animate) {
    document.documentElement.classList.add("site-intro-pending");
  }

  document.addEventListener("DOMContentLoaded", function () {
    window.setTimeout(function () {
      document.documentElement.classList.remove("site-entry-pending");
    }, 50);
    window.setTimeout(function () {
      document.documentElement.classList.remove("site-intro-pending");
    }, 2800);
  }, { once: true });

  if (!isHome) {
    document.documentElement.classList.add("has-site-sidebar");
  }

  try {
    if (localStorage.getItem("StudyQ-sidebar-collapsed") === "true") {
      document.documentElement.classList.add("site-nav-collapsed");
    }
  } catch (error) {
    // Keep the default expanded navigation when storage is unavailable.
  }
})();
