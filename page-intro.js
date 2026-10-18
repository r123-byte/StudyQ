/* ============================================================
   StudyStack — Simple page intro
   Uses the Web Animations API — no CSS classes, no injected
   stylesheets, no cascade conflicts. Bulletproof.
   ============================================================ */
(function () {
  "use strict";

  // Skip if the user prefers reduced motion
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  // Skip if the browser doesn't support Web Animations
  if (typeof Element.prototype.animate !== 'function') {
    return;
  }

  const STAGGER_MS = 70;   // delay between blocks
  const DURATION_MS = 650; // how long each block animates

  function getContainer() {
    return (
      document.querySelector('main.page') ||
      document.querySelector('.page') ||
      document.querySelector('main') ||
      document.querySelector('.wrapper')
    );
  }

  function getBlocks() {
    const container = getContainer();
    if (!container) return [];

    return Array.from(container.children).filter(function (el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'audio' || tag === 'video') return false;
      if (el.hasAttribute('hidden')) return false;
      if (el.hasAttribute('data-no-intro')) return false;
      if (el.classList.contains('page-decor')) return false;
      if (el.classList.contains('ss-intro')) return false;

      // Skip anything that is CSS-hidden right now (tabs, modals, etc.)
      // so we never animate things the user can't see.
      const computed = window.getComputedStyle(el);
      if (computed.display === 'none') return false;
      if (computed.visibility === 'hidden') return false;

      return true;
    });
  }

  function run() {
    const blocks = getBlocks();
    if (blocks.length === 0) {
      document.documentElement.classList.remove('intro-pending');
      return;
    }

    blocks.forEach(function (el, i) {
      // Web Animations API — runs on the element directly.
      // fill: 'both' holds the starting state during the delay
      // and the ending state after the animation completes.
      try {
        el.animate(
          [
            { opacity: 0, transform: 'translateY(18px) scale(0.96)' },
            { opacity: 1, transform: 'translateY(0) scale(1)' }
          ],
          {
            duration: DURATION_MS,
            delay: i * STAGGER_MS,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
            fill: 'both'
          }
        );
      } catch (error) {
        // Silently fail if animation fails (e.g., element removed)
      }
    });
    // The animations now hold their own starting and ending states, so the
    // pre-paint state can be removed without flashing the completed layout.
    document.documentElement.classList.remove('intro-pending');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
