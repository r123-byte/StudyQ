(function () {
  "use strict";

  const button = document.getElementById("privacy-clear-data");
  const status = document.getElementById("privacy-clear-status");
  if (!button || !status) return;

  const studyKeys = [
    "StudyQ-flashcards", "StudyQ-vocab-session", "StudyQ-planner-tests",
    "StudyQ-planner-homework", "StudyQ-planner-history", "StudyQ-planner-ai-output",
    "StudyQ-planner-ai-timetable", "StudyQ-planner-ai-focus", "StudyQ-planner-active-ai-block",
    "StudyQ-planner-completed-progress", "StudyQ-planner-conversation-history",
    "StudyQ-practice-test-history-v1", "StudyQ-tools"
  ];

  button.addEventListener("click", function () {
    const selected = document.querySelector('input[name="privacy-clear-scope"]:checked');
    const clearAll = selected && selected.value === "all";
    const message = clearAll
      ? "Clear all StudyQ data saved in this browser, including study content, history and preferences? This cannot be undone. Information already sent to external providers will not be deleted."
      : "Clear StudyQ study content and history saved in this browser? Language, sound and navigation preferences will remain. This cannot be undone. Information already sent to external providers will not be deleted.";
    if (!window.confirm(message)) return;

    try {
      const keys = clearAll
        ? Array.from({ length: localStorage.length }, function (_, index) { return localStorage.key(index); }).filter(function (key) { return key && key.startsWith("StudyQ-"); })
        : studyKeys;
      keys.forEach(function (key) { localStorage.removeItem(key); });
      if (clearAll) {
        const sessionKeys = Array.from({ length: sessionStorage.length }, function (_, index) { return sessionStorage.key(index); }).filter(function (key) { return key && key.startsWith("StudyQ-"); });
        sessionKeys.forEach(function (key) { sessionStorage.removeItem(key); });
        // Remove only the two known legacy StudyQ navigation keys as well.
        sessionStorage.removeItem("homepageScrollPos");
        sessionStorage.removeItem("homepageReturningFromTool");
      } else {
        // These namespaced keys only hold transient homepage navigation state.
        sessionStorage.removeItem("StudyQ-homepage-scroll-pos");
        sessionStorage.removeItem("StudyQ-homepage-returning-from-tool");
        sessionStorage.removeItem("homepageScrollPos");
        sessionStorage.removeItem("homepageReturningFromTool");
      }
      status.textContent = clearAll
        ? "All StudyQ data in this browser was cleared."
        : "Study content and history were cleared. Preferences were kept.";
    } catch (error) {
      status.textContent = "The browser did not allow StudyQ data to be cleared. You can clear this site's data in your browser settings.";
    }
  });
})();
