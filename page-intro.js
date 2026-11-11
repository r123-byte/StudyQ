(function () {
  "use strict";

  const root = document.documentElement;
  if (!root.classList.contains("site-intro-pending")) return;

  const selectors = [
    ".hero",
    ".hero-content > *",
    ".hero-visual",
    ".tool-card",
    ".pt-head",
    ".pt-card",
    ".timer-options",
    ".timer-card",
    ".setup-card",
    ".example-card",
    ".section-header",
    ".plan-card",
    ".ai-chat-shell",
    ".deck-view.active",
    ".contact-hero",
    ".contact-form",
    ".privacy-content",
    ".grade-list",
    ".result-card",
    ".comparison-card"
  ].join(",");

  const targets = Array.from(document.querySelectorAll(".page " + selectors))
    .filter(function (element) {
      if (element.matches("[data-no-intro]")) return false;
      if (element.closest(".top-bar, .site-sidebar, .app-sidebar, [aria-hidden='true']")) return false;
      if (element.parentElement.closest(selectors)) return false;

      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor.matches("[hidden]")) return false;
        const style = window.getComputedStyle(ancestor);
        if (style.display === "none" || style.visibility === "hidden") return false;
        if (ancestor.classList.contains("page")) break;
      }

      return true;
    });

  if (targets.length === 0) {
    root.classList.remove("site-intro-pending");
    return;
  }

  targets.forEach(function (element, index) {
    const animation = element.animate(
      [
        { opacity: 0, transform: "translate3d(0, 30px, 0) scale(.96)", filter: "blur(5px)" },
        { opacity: 1, transform: "translate3d(0, -3px, 0) scale(1.005)", filter: "blur(0)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)", filter: "blur(0)" }
      ],
      {
        duration: 1300,
        delay: Math.min(index, 7) * 140,
        easing: "cubic-bezier(.2, .75, .25, 1)",
        fill: "both"
      }
    );

    animation.addEventListener("finish", function () {
      animation.cancel();
    }, { once: true });
  });

  root.classList.remove("site-intro-pending");
})();
