(function () {
  "use strict";

  const script = document.currentScript;
  if (!script) return;

  const siteRoot = new URL("../", script.src);
  document.getAnimations().forEach(function (animation) {
    const name = animation.animationName;
    if (typeof name === "string" && !/(spin|loader|loading|dots)/i.test(name)) {
      animation.cancel();
    }
  });

  const icon = function (content) {
    return '<span class="site-sidebar-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + content + "</svg></span>";
  };
  const links = [
    { group: "start", items: [
      { key: "home", href: "", tone: "", icon: '<path d="m3 10 9-7 9 7"></path><path d="M5 9v11h14V9M9 20v-6h6v6"></path>' }
    ] },
    { group: "study", items: [
      { key: "calc", href: "calculator/", tone: "tone-blue", icon: '<rect x="5" y="2.5" width="14" height="19" rx="2"></rect><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"></path>' },
      { key: "word", href: "vocab/", tone: "tone-peach", icon: '<path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1M22 22l-5-10-5 10M14 18h6"></path>' },
      { key: "flashcards", href: "flashcards/", tone: "tone-lilac", icon: '<rect x="3" y="6" width="14" height="15" rx="2"></rect><path d="M7 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2"></path>' },
      { key: "practiceTest", href: "practice-test/", tone: "tone-blue", icon: '<path d="M8 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"></path><rect x="8" y="2" width="8" height="4" rx="1"></rect><path d="m8 13 2 2 5-5"></path>' }
    ] },
    { group: "focusPlan", items: [
      { key: "pomo", href: "pomodoro/", tone: "tone-mint", icon: '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2 2M9 2h6M12 2v3M19 5l-1.5 1.5M5 5l1.5 1.5"></path>' },
      { key: "planner", href: "planner/", tone: "tone-sand", icon: '<rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18M9 15l2 2 4-4"></path>' }
    ] }
  ];

  const labels = {
    en: {
      start: "START HERE", home: "Home", study: "STUDY", focusPlan: "FOCUS & PLAN",
      calc: "Grade Calculator", word: "Word Trainer", flashcards: "Flashcards",
      practiceTest: "Practice Test", pomo: "Pomodoro Timer", planner: "Testweek Planner",
      note: "Free tools, made for students.", expand: "Expand navigation", collapse: "Collapse navigation"
    },
    nl: {
      start: "BEGIN HIER", home: "Startpagina", study: "LEREN", focusPlan: "FOCUS & PLANNEN",
      calc: "Cijfercalculator", word: "Woordtrainer", flashcards: "Flashcards",
      practiceTest: "Oefentoets", pomo: "Pomodoro-timer", planner: "Toetsweekplanner",
      note: "Gratis tools, gemaakt voor scholieren.", expand: "Navigatie uitklappen", collapse: "Navigatie inklappen"
    }
  };

  const readLanguage = function () {
    try {
      return localStorage.getItem("StudyQ-language") === "en" ? "en" : "nl";
    } catch (error) {
      return "nl";
    }
  };
  const pageKey = function () {
    const path = location.pathname.replace(/\/+$/, "");
    const lastSegment = path.split("/").pop();
    return lastSegment === "index.html" ? path.split("/").slice(-2, -1)[0] || "home" : lastSegment || "home";
  };
  const currentPage = pageKey();
  const isHome = currentPage === "home";
  let sidebar = document.querySelector(".app-sidebar");

  function makeSidebar() {
    const nav = document.createElement("aside");
    nav.className = "site-sidebar";
    nav.setAttribute("aria-label", "StudyQ navigation");
    const brand = document.createElement("a");
    brand.className = "site-sidebar-brand";
    brand.href = siteRoot.href;
    brand.innerHTML = '<img src="' + new URL("logo/logo.png", siteRoot).href + '" alt=""><span class="brand-wordmark">Study<span class="brand-q">Q</span></span>';
    const header = document.createElement("div");
    header.className = "site-sidebar-header";
    header.appendChild(brand);
    nav.appendChild(header);

    const toggle = document.createElement("button");
    toggle.className = "site-sidebar-toggle";
    toggle.type = "button";
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
    header.appendChild(toggle);

    const navEl = document.createElement("nav");
    navEl.className = "site-sidebar-nav";
    navEl.setAttribute("aria-label", "Study tools");
    links.forEach(function (group) {
      const groupEl = document.createElement("div");
      groupEl.className = "site-sidebar-group";
      const heading = document.createElement("p");
      heading.className = "site-sidebar-label";
      heading.dataset.siteNavKey = group.group;
      groupEl.appendChild(heading);
      group.items.forEach(function (item) {
        const link = document.createElement("a");
        link.className = "site-sidebar-link";
        link.href = new URL(item.href, siteRoot).href;
        const iconHTML = icon(item.icon).replace('class="site-sidebar-icon"', 'class="site-sidebar-icon ' + item.tone + '"');
        link.innerHTML = iconHTML + '<span data-site-nav-label="' + item.key + '"></span>';
        const destination = new URL(link.href).pathname.replace(/\/+$/, "").replace(/\/index\.html$/, "");
        const current = location.pathname.replace(/\/+$/, "").replace(/\/index\.html$/, "");
        if (destination === current || (item.key === "home" && !current)) {
          link.classList.add("is-active");
          link.setAttribute("aria-current", "page");
        }
        groupEl.appendChild(link);
      });
      navEl.appendChild(groupEl);
    });
    nav.appendChild(navEl);
    const note = document.createElement("div");
    note.className = "site-sidebar-note";
    note.innerHTML = '<span class="site-sidebar-note-icon" aria-hidden="true">✦</span><p></p>';
    nav.appendChild(note);
    document.body.insertBefore(nav, document.body.firstChild);
    document.body.classList.add("has-site-sidebar");
    return nav;
  }

  function updateLabels() {
    const language = labels[readLanguage()];
    sidebar.querySelectorAll("[data-site-nav-key]").forEach(function (element) {
      const key = element.dataset.siteNavKey;
      if (language[key]) element.textContent = language[key];
    });
    sidebar.querySelectorAll("[data-site-nav-label]").forEach(function (element) {
      element.textContent = language[element.dataset.siteNavLabel] || "";
    });
    sidebar.querySelector(".site-sidebar-note p, .sidebar-note p").textContent = language.note;
    const toggle = sidebar.querySelector(".site-sidebar-toggle, .sidebar-toggle");
    const expanded = !document.body.classList.contains("site-nav-collapsed") && !document.documentElement.classList.contains("site-nav-collapsed");
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.setAttribute("aria-label", expanded ? language.collapse : language.expand);
    toggle.title = expanded ? language.collapse : language.expand;
  }

  if (!sidebar) sidebar = makeSidebar();
  if (isHome) {
    const toggle = document.createElement("button");
    toggle.className = "sidebar-toggle";
    toggle.type = "button";
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
    const header = document.createElement("div");
    header.className = "app-sidebar-header";
    const brand = sidebar.querySelector(".brand");
    sidebar.insertBefore(header, brand);
    header.append(brand, toggle);
  }

  let collapsed = false;
  try { collapsed = localStorage.getItem("StudyQ-sidebar-collapsed") === "true"; } catch (error) {}
  function setCollapsed(value) {
    collapsed = value;
    document.body.classList.toggle("site-nav-collapsed", value);
    document.documentElement.classList.toggle("site-nav-collapsed", value);
    sidebar.classList.toggle("is-collapsed", value);
    try { localStorage.setItem("StudyQ-sidebar-collapsed", String(value)); } catch (error) {}
    updateLabels();
  }
  const toggleButton = sidebar.querySelector(".site-sidebar-toggle, .sidebar-toggle");
  toggleButton.addEventListener("click", function () { setCollapsed(!collapsed); });
  setCollapsed(collapsed);
  sidebar.classList.add("is-ready");
  updateLabels();

  document.addEventListener("change", function (event) {
    if (event.target && event.target.matches("#language-select")) setTimeout(updateLabels, 0);
  });
  document.addEventListener("click", function (event) {
    if (event.target.closest(".language-option")) setTimeout(updateLabels, 0);
  });
  window.addEventListener("storage", function (event) {
    if (event.key === "StudyQ-language") updateLabels();
  });
})();
