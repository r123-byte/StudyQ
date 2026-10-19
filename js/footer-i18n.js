(function () {
  "use strict";

  const copy = {
    en: {
      description: "Made by students, for students. Free tools to help you study smarter, stay focused, and ace your tests.",
      tools: "Tools",
      calculator: "Grade Calculator",
      pomodoro: "Pomodoro Timer",
      planner: "Testweek Planner",
      vocab: "Vocabulary Trainer",
      flashcards: "Flashcards",
      support: "Support",
      home: "Home",
      contact: "Contact Us",
      privacy: "Privacy Policy",
      copyright: "© 2026 StudyStack. All rights reserved."
    },
    nl: {
      description: "Gemaakt door scholieren, voor scholieren. Gratis hulpmiddelen om slimmer te leren, geconcentreerd te blijven en je toetsen te halen.",
      tools: "Hulpmiddelen",
      calculator: "Cijfercalculator",
      pomodoro: "Pomodoro-timer",
      planner: "Toetsweekplanner",
      vocab: "Woordtrainer",
      flashcards: "Flashcards",
      support: "Ondersteuning",
      home: "Startpagina",
      contact: "Contact",
      privacy: "Privacyverklaring",
      copyright: "© 2026 StudyStack. Alle rechten voorbehouden."
    }
  };

  function applyLanguage(language) {
    const lang = language === "nl" ? "nl" : "en";
    document.querySelectorAll("[data-footer-i18n]").forEach(function (element) {
      const key = element.dataset.footerI18n;
      if (copy[lang][key]) element.textContent = copy[lang][key];
    });
  }

  applyLanguage(document.documentElement.lang);

  const selector = document.getElementById("language-select");
  if (selector) {
    selector.addEventListener("change", function () {
      applyLanguage(selector.value);
    });
  }

  new MutationObserver(function () {
    applyLanguage(document.documentElement.lang);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
