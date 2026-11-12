(function () {
  "use strict";

  const flagPaths = {
    en: "../assets/flag-england.svg",
    nl: "../assets/flag-netherlands.svg"
  };
  const languageNames = {
    en: {
      name: "English",
      label: "Language: English",
      menu: "Choose language",
      options: { en: "English", nl: "Dutch" }
    },
    nl: {
      name: "Nederlands",
      label: "Taal: Nederlands",
      menu: "Kies een taal",
      options: { en: "Engels", nl: "Nederlands" }
    }
  };

  document.querySelectorAll(".language-picker").forEach(function (picker) {
    const trigger = picker.querySelector(".language-trigger");
    const currentName = picker.querySelector("#language-current");
    const currentFlag = trigger && trigger.querySelector(".language-flag");
    const menu = picker.querySelector(".language-menu");
    const options = menu ? Array.from(menu.querySelectorAll(".language-option")) : [];
    const select = picker.querySelector(".language-sync-select");

    if (!trigger || !currentName || !currentFlag || !menu || !select || options.length === 0) return;

    function renderLanguage(language) {
      const lang = language === "en" ? "en" : "nl";
      const copy = languageNames[lang];
      currentName.textContent = copy.name;
      currentFlag.src = flagPaths[lang];
      trigger.setAttribute("aria-label", copy.label);
      menu.setAttribute("aria-label", copy.menu);
      options.forEach(function (option) {
        option.setAttribute("aria-checked", String(option.dataset.language === lang));
        const label = option.querySelector("span");
        if (label) label.textContent = copy.options[option.dataset.language];
      });
      select.value = lang;
    }

    function setMenuOpen(open) {
      trigger.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      if (open) {
        const selected = options.find(function (option) {
          return option.dataset.language === document.documentElement.lang;
        });
        (selected || options[0]).focus();
      }
    }

    function selectLanguage(language) {
      if (language !== "en" && language !== "nl") return;
      select.value = language;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      if (document.documentElement.lang !== language) {
        document.documentElement.lang = language;
        try {
          localStorage.setItem("StudyQ-language", language);
        } catch (error) {
          console.warn("Unable to save the selected language.", error);
        }
      }
      renderLanguage(document.documentElement.lang);
      setMenuOpen(false);
      trigger.focus();
    }

    trigger.addEventListener("click", function () {
      setMenuOpen(menu.hidden);
    });

    options.forEach(function (option) {
      option.addEventListener("click", function () {
        selectLanguage(option.dataset.language);
      });
    });

    menu.addEventListener("keydown", function (event) {
      const currentIndex = options.indexOf(document.activeElement);
      let nextIndex;
      if (event.key === "ArrowDown") nextIndex = (currentIndex + 1) % options.length;
      else if (event.key === "ArrowUp") nextIndex = (currentIndex - 1 + options.length) % options.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = options.length - 1;
      else if (event.key === "Escape") {
        setMenuOpen(false);
        trigger.focus();
        event.preventDefault();
        return;
      } else {
        return;
      }
      event.preventDefault();
      options[nextIndex].focus();
    });

    document.addEventListener("click", function (event) {
      if (!picker.contains(event.target)) setMenuOpen(false);
    });

    let savedLanguage = document.documentElement.lang;
    try {
      savedLanguage = localStorage.getItem("StudyQ-language") || savedLanguage || "nl";
    } catch (error) {
      console.warn("Unable to read the saved language.", error);
    }
    renderLanguage(savedLanguage);
  });
})();
