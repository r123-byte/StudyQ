/* ============================================================
   StudyStack — AI Planner (with bi-directional Pomodoro bridge)
   Hardened per operational rules:
   1. Real-time injection + emoji enforcement
   2. Conditional study tables (no table on casual chat)
   3. Bi-directional Pomodoro sync
   4. Scope & formatting (section IDs, no lettered prefixes, HH:MM)
   Model: DeepSeek V3.2 via OpenRouter
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     CONFIG
     ============================================================ */
  // API keys live server-side in the Netlify function's environment variables.
  // The frontend never sees them. All requests go through the proxy.
  const PROXY_URL = "https://timely-dasik-afcd22.netlify.app/.netlify/functions/proxy?path=openrouter/chat/completions";
  const MODEL = "dots-studio/dots-3-note-preview:free";

  const STORAGE_KEY = "studystack-planner-tests";
  const OUTPUT_KEY = "studystack-planner-ai-output";
  const TIMETABLE_KEY = "studystack-planner-ai-timetable";
  const FOCUS_KEY = "studystack-planner-ai-focus";

  const BRIDGE_KEY = "studystack-planner-active-ai-block";
  const PROGRESS_KEY = "studystack-planner-completed-progress";

  /* ============================================================
     FIXED SYSTEM PROMPT
     ============================================================ */
  const SYSTEM_PROMPT = [
    "You are StudyStack's study planner coach for secondary school students. You are warm, precise, and brief.",
    "",
    "============================================================",
    "RULE PRIORITY (apply in this order when rules conflict)",
    "============================================================",
    "1. Grounding and honesty — never invent facts.",
    "2. Real-time accuracy — always use the CURRENT DATE & TIME block.",
    "3. Table discipline — no table unless explicitly requested.",
    "4. Formatting — section numbers, HH:MM - HH:MM, no lettered prefixes.",
    "5. Tone — warm, encouraging, emoji-friendly, brief.",
    "",
    "============================================================",
    "REAL-TIME CONTEXT",
    "============================================================",
    "Every user message begins with a CURRENT DATE & TIME block. That block is the present moment.",
    "Never invent dates. Use only dates from the current context, CORE FACTS, and COMPLETED PROGRESS.",
    "Every time reference you produce must use two-digit HH:MM - HH:MM format, e.g. 14:05 - 14:45.",
    "If the user asks for a schedule and no study window is supplied, ask for their available hours before producing anything.",
    "",
    "============================================================",
    "CONVERSATION MEMORY",
    "============================================================",
    "You receive the recent conversation as alternating user and assistant messages before the current one.",
    "Read that history first. It tells you what you already said, what plan you already made, and what the student already told you.",
    "If the student refers to something from earlier — 'that plan', 'add Tuesday', 'make block 2 longer', 'the math one' — resolve the reference from the history. Never ask 'which plan?' when the answer is already in the history.",
    "If the student corrects you ('no, I meant Thursday' or 'that is wrong'), accept the correction, apologize briefly if needed, and produce an updated answer. Do not re-litigate.",
    "If the student asks the same question again, give a fresh answer. Do not copy-paste your previous reply verbatim.",
    "Do not repeat what you said in the previous message unless the student asks you to clarify.",
    "",
    "============================================================",
    "GROUNDING",
    "============================================================",
    "Use only facts from CORE FACTS, the USER REQUEST, and COMPLETED PROGRESS. Nothing else.",
    "CORE FACTS contains both saved tests and quick-add homework. Treat both as complete, first-class facts.",
    "Never invent subjects, sections, topics, study windows, durations, or time blocks.",
    "Never ask the student to expand on a homework task that already has a title, time, and difficulty. Those three fields are sufficient.",
    "If a required fact is genuinely missing, ask exactly one concise clarifying question. Never ask two questions in one reply.",
    "",
    "============================================================",
    "QUICK-ADD HOMEWORK",
    "============================================================",
    "The student can log homework via a quick-add widget. Each entry has a Title, Time required in minutes, and Difficulty (1-5).",
    "Every quick-add homework task is a MANDATORY commitment. It must appear in any study plan you generate unless COMPLETED PROGRESS already shows it done.",
    "If a homework title contains a section number such as '4.1' or '§4.1', copy that number verbatim into the Action Plan cell.",
    "If a homework title has no section number, use the title itself as the task identifier, shortened to a few words.",
    "Never merge homework tasks together. Never drop one. Never ask for subject, time, or difficulty — they are already supplied.",
    "",
    "============================================================",
    "STUDY TASKS",
    "============================================================",
    "Identify every study task by its section number or its supplied title. Examples of valid identifiers: 'Study section 4.1', 'Review §3.2', 'Opgaven 1-10 §4.1', 'Chapters 6-7 test prep'.",
    "Never reproduce notes, formulas, textbook passages, or explanatory content.",
    "Never paraphrase the material. Reference it by number or by the exact short title from CORE FACTS.",
    "Every Action Plan cell must contain one short instruction, not a paragraph.",
    "",
    "============================================================",
    "FORMATTING",
    "============================================================",
    "Never use lettered prefixes such as 'a)', 'b)', 'A.', 'B.'.",
    "Never use bullet prefixes such as '-', '*', '•'.",
    "Never use numbered lists like '1.', '2.'.",
    "Chat replies are prose only. If you need to break out items, use short sentences separated by periods.",
    "Every table cell is a single line of plain text. No markdown emphasis inside cells.",
    "Use two-digit hours and minutes everywhere: 09:05 not 9:5. 14:00 not 14:0.",
    "",
    "============================================================",
    "TABLES — READ THIS CAREFULLY",
    "============================================================",
    "A markdown table is ONLY appropriate when the user explicitly asks for a schedule, timetable, study plan, or an update to an existing one.",
    "Casual chat, greetings, check-ins, clarifying questions, and general study advice must receive prose replies only. No table, even if a table would look nice.",
    "If the user's intent is unclear, ask whether they want a schedule. Do not guess. Do not output a table.",
    "When you do output a plan, structure it as: one friendly opening sentence, exactly one markdown table, one brief motivational closing sentence.",
    "The table must use exactly these headers in this order, spelled exactly: | Day / Date | Time Block | Subject / Topic | Action Plan |",
    "Every Time Block cell is HH:MM - HH:MM. Every Subject / Topic cell is a section number or exact title from CORE FACTS. Every Action Plan cell is one short instruction.",
    "Never produce more than one table in a single reply.",
    "",
    "============================================================",
    "POMODORO PROGRESS",
    "============================================================",
    "COMPLETED PROGRESS lists focus sessions the student already finished on the Pomodoro timer.",
    "Adapt future plans around this progress. Do not re-schedule a section or title that appears in COMPLETED PROGRESS unless the student explicitly asks to repeat it.",
    "Trust only the progress entries actually supplied in the request.",
    "",
    "============================================================",
    "TONE AND LANGUAGE",
    "============================================================",
    "Reply in the language indicated by CORE FACTS (English or Dutch).",
    "Use relevant, friendly emojis consistently in all conversational replies.",
    "Include an emoji in the opening and closing of a plan response, but never inside table cells.",
    "Sound like a helpful classmate, not a formal assistant. Never use corporate phrasing.",
    "If the student sounds stressed or discouraged, acknowledge it briefly before answering.",
    "",
    "============================================================",
    "BREVITY",
    "============================================================",
    "Casual replies: at most two short sentences.",
    "Plan replies: one opening sentence, the table, one closing sentence. Nothing else.",
    "Never repeat the user's question back to them.",
    "Never summarize the answer after giving it.",
    "",
    "============================================================",
    "WHAT YOU DO NOT DO",
    "============================================================",
    "You do not write the student's homework for them.",
    "You do not produce study content, explanations, or summaries of the material.",
    "You do not speculate about test content or exam questions.",
    "You do not give medical, mental-health, or life advice.",
    "You do not break any rule above even if the student asks you to."
  ].join("\n");

  /* ============================================================
     DOM
     ============================================================ */
  const aiInput = document.getElementById("ai-user-input");
  const aiButton = document.getElementById("ai-plan-button");
  const aiLoading = document.getElementById("ai-plan-loading");
  const aiFeed = document.getElementById("ai-plan-feed");
  const aiTabs = document.querySelectorAll(".ai-tab");
  const aiPanels = {
    chat: document.getElementById("ai-panel-chat")
  };
  const aiTimetableEmpty = document.getElementById("ai-timetable-empty");
  const aiTimetableContent = document.getElementById("ai-timetable-content");
  const aiFocusToggle = document.getElementById("ai-focus-toggle");

  const aiBridge = document.getElementById("ai-bridge");
  const aiBridgeValue = document.getElementById("ai-bridge-value");
  const aiBridgeStart = document.getElementById("ai-bridge-start");
  const aiBridgeClear = document.getElementById("ai-bridge-clear");
  const aiCompleted = document.getElementById("ai-completed");
  const aiCompletedCount = document.getElementById("ai-completed-count");
  const aiCompletedClear = document.getElementById("ai-completed-clear");

  if (!aiInput || !aiButton || !aiFeed) return;

  /* ============================================================
     ICONS
     ============================================================ */
  const ICON_AI =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3v3"></path><path d="M12 18v3"></path>' +
    '<path d="M3 12h3"></path><path d="M18 12h3"></path>' +
    '<path d="M5.6 5.6 8 8"></path><path d="M16 16l2.4 2.4"></path>' +
    '<path d="M5.6 18.4 8 16"></path><path d="M16 8l2.4-2.4"></path>' +
    '</svg>';
  const ICON_USER =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>' +
    '<circle cx="12" cy="7" r="4"></circle>' +
    '</svg>';

  /* ============================================================
     HELPERS
     ============================================================ */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function currentLanguage() {
    return localStorage.getItem("studystack-language") === "en" ? "en" : "nl";
  }

  function readTestsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(function (t) {
        return {
          subject: String(t.subject || "").trim(),
          dateISO: String(t.dateISO || ""),
          time: String(t.time || ""),
          weight: Number(t.weight) || 1,
          chapters: String(t.chapters || "").trim(),
          size: String(t.size || ""),
          difficulty: String(t.difficulty || ""),
          studyLevel: String(t.studyLevel || "")
        };
      });
    } catch (e) { return []; }
  }

  /* ============================================================
     QUICK-ADD HOMEWORK READER
     Reads the homework the student logged via the quick-add widget
     and normalises it for inclusion in CORE FACTS.
     ============================================================ */
  const HOMEWORK_KEY = "studystack-planner-homework";

  function readHomeworkFromStorage() {
    try {
      const raw = localStorage.getItem(HOMEWORK_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(function (h) {
        return {
          title: String(h.title || "").trim(),
          minutes: Math.max(5, Math.min(240, Number(h.minutes) || 30)),
          difficulty: Math.max(1, Math.min(5, Number(h.difficulty) || 3))
        };
      }).filter(function (h) { return h.title; });
    } catch (e) { return []; }
  }

  function getFocusPreference() {
    try {
      const v = localStorage.getItem(FOCUS_KEY);
      if (v === "dual" || v === "single") return v;
    } catch (e) {}
    return "single";
  }
  function setFocusPreference(v) {
    try { localStorage.setItem(FOCUS_KEY, v); } catch (e) {}
  }

  function readBridgeBlock() {
    try {
      const raw = localStorage.getItem(BRIDGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }
  function writeBridgeBlock(block) {
    try {
      if (block) localStorage.setItem(BRIDGE_KEY, JSON.stringify(block));
      else localStorage.removeItem(BRIDGE_KEY);
    } catch (e) {}
  }
  function readProgressList() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  }
  function writeProgressList(list) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  const HISTORY_STORAGE_KEY = "studystack-planner-conversation-history";
  const MAX_HISTORY_TURNS = 12;        // 6 exchanges (6 user + 6 assistant)
  const MAX_HISTORY_CHARS = 6000;      // hard cap so prompts stay small
  const HISTORY_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours

  function readConversationHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const now = Date.now();
      const fresh = parsed.filter(function (m) {
        return m && m.at && (now - m.at) < HISTORY_MAX_AGE_MS &&
               (m.role === "user" || m.role === "assistant") &&
               typeof m.content === "string";
      });

      // Trim to the last N turns
      return fresh.slice(-MAX_HISTORY_TURNS);
    } catch (e) {
      return [];
    }
  }

  function writeConversationHistory(list) {
    try {
      // Trim by char budget from the end (most recent first)
      let total = 0;
      const kept = [];
      for (let i = list.length - 1; i >= 0; i--) {
        const entry = list[i];
        const len = entry.content.length;
        if (total + len > MAX_HISTORY_CHARS && kept.length > 0) break;
        kept.unshift(entry);
        total += len;
      }
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(kept.slice(-MAX_HISTORY_TURNS)));
    } catch (e) {}
  }

  function appendConversationTurn(role, content) {
    if (!content || typeof content !== "string") return;
    const list = readConversationHistory();
    list.push({
      role: role,
      content: content.trim(),
      at: Date.now()
    });
    writeConversationHistory(list);
  }

  function clearConversationHistory() {
    try { localStorage.removeItem(HISTORY_STORAGE_KEY); } catch (e) {}
  }

  function getMemoryTurnCount() {
    return readConversationHistory().length;
  }

  function minutesFromTimeBlock(timeBlock) {
    if (!timeBlock) return null;
    const m = String(timeBlock).match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const sH = parseInt(m[1], 10), sM = parseInt(m[2], 10);
    const eH = parseInt(m[3], 10), eM = parseInt(m[4], 10);
    const start = sH * 60 + sM;
    let end = eH * 60 + eM;
    if (end < start) end += 24 * 60;
    const diff = end - start;
    return diff > 0 && diff <= 240 ? diff : null;
  }

  function extractTimeRange(str) {
    if (!str) return null;
    const m = String(str).match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
    if (!m) return null;
    return m[1] + " - " + m[2];
  }

  /* ============================================================
     HARDENING HELPERS
     ============================================================ */
  function looksLikeScheduleRequest(text) {
    if (!text) return false;
    const s = String(text).toLowerCase();
    return /\b(plan|planning|planner|schedule|timetable|rooster|studieplan|inplannen|plan een|maak een plan|update the plan|update my plan|new plan|revise|reschedule|herplan|nieuw plan|studieplan maken)\b/.test(s);
  }

  function responseContainsTable(raw) {
    const rows = extractMarkdownTable(raw);
    return Array.isArray(rows) && rows.length >= 2;
  }

  function looksLikeSectionId(cell) {
    if (!cell) return false;
    return /\d/.test(String(cell));
  }

  function looksLikeTimeBlock(cell) {
    if (!cell) return false;
    return /^\s*\d{1,2}:\d{2}\s*[-–—]\s*\d{1,2}:\d{2}\s*$/.test(String(cell));
  }

  /* ============================================================
     BUILD CORE FACTS + COMPLETED PROGRESS + CURRENT MOMENT
     ============================================================ */
  function buildCoreFacts() {
    const tests = readTestsFromStorage();
    const homework = readHomeworkFromStorage();
    const lines = [];
    lines.push("CORE FACTS:");

    // Debug: verify what the model is actually receiving (remove in production)
    try {
      console.log(
        "[StudyStack] CORE FACTS — tests:",
        tests.length,
        "| homework:",
        homework.length,
        homework
      );
    } catch (e) {}

    const hasTests = tests.length > 0;
    const hasHomework = homework.length > 0;

    if (!hasTests && !hasHomework) {
      lines.push("- No tests or homework are currently saved in the planner.");
    }

    // --- TESTS ---
    if (hasTests) {
      lines.push("- SAVED TESTS:");
      tests.forEach(function (t, i) {
        const bits = [];
        bits.push((i + 1) + ") Subject: " + (t.subject || "(unknown)"));
        if (t.dateISO) bits.push("Date: " + t.dateISO + (t.time ? " " + t.time : ""));
        if (t.weight) bits.push("Weight: " + t.weight);
        if (t.chapters) bits.push("Material: " + t.chapters);
        if (t.size) bits.push("Size: " + t.size);
        if (t.difficulty) bits.push("Difficulty: " + t.difficulty);
        if (t.studyLevel) bits.push("Study level: " + t.studyLevel);
        lines.push("  " + bits.join(" | "));
      });
    }

    // --- QUICK-ADD HOMEWORK ---
    if (hasHomework) {
      lines.push("- QUICK-ADD HOMEWORK (MANDATORY — every task below must appear in any study plan):");
      homework.forEach(function (h, i) {
        const bits = [];
        bits.push((i + 1) + ") Title: " + h.title);
        bits.push("Time required: " + h.minutes + " min");
        bits.push("Difficulty: " + h.difficulty + "/5");
        lines.push("  " + bits.join(" | "));
      });
      lines.push(
        "- RULES FOR THE HOMEWORK ABOVE: " +
        "Include every homework task in any plan you generate. " +
        "Do not ask the student for more details — title, time, and difficulty are sufficient. " +
        "If a title contains a section number like '§4.1' or '4.1', copy it verbatim into the Action Plan cell. " +
        "If a title has no section number, use the title itself as the task identifier. " +
        "Do not merge homework tasks. Do not skip any."
      );
    }

    // --- STUDY FOCUS ---
    const focus = getFocusPreference();
    if (focus === "dual") {
      lines.push("- STUDY FOCUS: the student wants to study TWO subjects at the same time.");
    } else {
      lines.push("- STUDY FOCUS: the student wants to focus on the SINGLE upcoming subject only.");
    }

    // --- LANGUAGE ---
    lines.push("- Reply language: " + (currentLanguage() === "en" ? "English" : "Dutch") + ".");

    return lines.join("\n");
  }

  function buildCompletedProgress() {
    const list = readProgressList();
    if (list.length === 0) return null;

    const recent = list.slice(-20);
    const lines = [];
    lines.push("COMPLETED PROGRESS (focus sessions the student just finished on the Pomodoro timer):");
    recent.forEach(function (p, i) {
      const bits = [];
      bits.push((i + 1) + ")");
      if (p.subject) bits.push("Subject: " + p.subject);
      if (p.action) bits.push("Action: " + p.action);
      if (p.timeBlock) bits.push("Block: " + p.timeBlock);
      if (p.day) bits.push("Day: " + p.day);
      if (p.minutes) bits.push("Minutes: " + p.minutes);
      if (p.confidence) bits.push("Confidence: " + p.confidence);
      if (p.outcome) bits.push("Outcome: " + p.outcome);
      lines.push("  " + bits.join(" | "));
    });
    lines.push("- Do not re-schedule these exact blocks in future plans unless the student explicitly asks to repeat them.");
    return lines.join("\n");
  }

  function buildRealtimeLine() {
    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, "0"); };
    const y = now.getFullYear(), m = pad(now.getMonth() + 1), d = pad(now.getDate());
    const hh = pad(now.getHours()), mm = pad(now.getMinutes()), ss = pad(now.getSeconds());
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const weekdaysNl = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
    return "CURRENT DATE & TIME:\n" +
      "- Real moment right now: " + y + "-" + m + "-" + d + " " + hh + ":" + mm + ":" + ss +
      " (" + weekdays[now.getDay()] + " / " + weekdaysNl[now.getDay()] + ")\n" +
      "- Use this as the present moment. Every time block must be in HH:MM - HH:MM format.";
  }

  function buildUserMessage(userRequest) {
    const isSchedule = looksLikeScheduleRequest(userRequest);
    const parts = [buildRealtimeLine()];

    if (isSchedule) {
      // Full context for schedule requests
      parts.push("");
      parts.push("CORE FACTS (the only source of truth you may rely on):");
      parts.push(buildCoreFacts());

      const completed = buildCompletedProgress();
      if (completed) {
        parts.push("");
        parts.push(completed);
      }
    } else {
      // Casual chat: still mention homework + subjects so the model can
      // reference them if the student asks, but keep the prompt small.
      const tests = readTestsFromStorage();
      const homework = readHomeworkFromStorage();
      const bits = [];

      if (tests.length > 0) {
        const subjects = Array.from(new Set(
          tests.map(function (t) { return t.subject; }).filter(Boolean)
        ));
        bits.push("Subjects: " + subjects.join(", "));
      }
      if (homework.length > 0) {
        const titles = homework.map(function (h) { return h.title; }).filter(Boolean);
        bits.push("Homework logged: " + titles.join("; "));
      }
      if (bits.length > 0) {
        parts.push("");
        parts.push("STUDENT CONTEXT (reference only): " + bits.join(". "));
      }
    }

    parts.push("");
    parts.push("USER REQUEST:");
    parts.push(userRequest || "(no specific request — reply as a friendly chat assistant)");

    return parts.join("\n");
  }

  function buildMessages(currentUserRequest) {
    const history = readConversationHistory();
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    history.forEach(function (entry) {
      messages.push({ role: entry.role, content: entry.content });
    });

    messages.push({
      role: "user",
      content: buildUserMessage(currentUserRequest)
    });

    return messages;
  }

  /* ============================================================
     INLINE FORMATTING
     ============================================================ */
  function inlineFormat(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    s = s.replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");
    s = s.replace(/(^|\s)\*+(\s|$)/g, "$1$2");
    s = s.replace(/(^|\s)[-+•]\s+/g, "$1");
    s = s.replace(/(^|\s)[a-zA-Z]\)\s+/g, "$1");
    return s;
  }

  function isTableSeparator(line) {
    return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
  }
  function splitTableRow(line) {
    let trimmed = line.trim();
    if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
    if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
    return trimmed.split("|").map(function (cell) { return cell.trim(); });
  }

  /* ============================================================
     DAY-BY-DAY PLANNING TILES
     Renders the same rows array that renderTable() used to render
     as a markdown table, but as grouped day tiles: one card per
     day, one tile per time block inside it.
     ============================================================ */
  function renderDayTiles(rows, opts) {
    opts = opts || {};
    if (!rows || rows.length < 2) return "";

    const header = rows[0].map(function (c) { return String(c || "").toLowerCase().trim(); });
    const idxDay   = header.indexOf("day / date");
    const idxTime  = header.indexOf("time block");
    const idxSubj  = header.indexOf("subject / topic");
    const idxAct   = header.indexOf("action plan");

    const dayCol   = idxDay   >= 0 ? idxDay   : 0;
    const timeCol  = idxTime  >= 0 ? idxTime  : 1;
    const subjCol  = idxSubj  >= 0 ? idxSubj  : 2;
    const actCol   = idxAct   >= 0 ? idxAct   : 3;

    const groups = [];
    const byDay  = {};
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      const day   = String(r[dayCol]  || "").trim();
      const time  = String(r[timeCol] || "").trim();
      const subj  = String(r[subjCol] || "").trim();
      const act   = String(r[actCol]  || "").trim();
      if (!day && !time && !subj && !act) continue;

      const key = day || "—";
      if (!byDay[key]) {
        byDay[key] = { day: key, blocks: [] };
        groups.push(byDay[key]);
      }
      byDay[key].blocks.push({ time: time, subject: subj, action: act });
    }
    if (groups.length === 0) return "";

    const doneSet   = opts.doneSet   || new Set();
    const activeSet = opts.activeSet || new Set();

    const CAL_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="3" y="4" width="18" height="18" rx="2"></rect>' +
      '<path d="M16 2v4M8 2v4M3 10h18"></path></svg>';

    const CLOCK_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="10"></circle>' +
      '<path d="M12 6v6l4 2"></path></svg>';

    const PLAY_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">' +
      '<polygon points="6 4 20 12 6 20 6 4"></polygon></svg>';

    const CHECK_ICON =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M20 6 9 17l-5-5"></path></svg>';

    const tBlocks = (currentLanguage() === "en")
      ? function (n) { return n + (n === 1 ? " block" : " blocks"); }
      : function (n) { return n + (n === 1 ? " blok" : " blokken"); };

    let html = '<div class="day-tiles">';

    groups.forEach(function (group) {
      html += '<section class="day-tile">';
      html += '<header class="day-tile-header">';
      html += '<span class="day-tile-icon" aria-hidden="true">' + CAL_ICON + '</span>';
      html += '<h3 class="day-tile-title">' + escapeHtml(group.day) + '</h3>';
      html += '<span class="day-tile-count">' + tBlocks(group.blocks.length) + '</span>';
      html += '</header>';
      html += '<div class="day-tile-blocks">';

      group.blocks.forEach(function (block) {
        const sig = (group.day + "||" + block.time).toLowerCase();
        const isDone   = doneSet.has(sig);
        const isActive = !isDone && activeSet.has(sig);

        let cls = "block-tile";
        if (isDone)   cls += " block-tile-done";
        if (isActive) cls += " block-tile-active";

        html += '<article class="' + cls + '">';

        if (block.time) {
          html += '<span class="block-tile-time">' + CLOCK_ICON + escapeHtml(block.time) + '</span>';
        }

        html += '<div class="block-tile-body">';
        if (block.subject) {
          html += '<div class="block-tile-subject">' + escapeHtml(block.subject) + '</div>';
        }
        if (block.action) {
          html += '<div class="block-tile-action">' + escapeHtml(block.action) + '</div>';
        }
        html += '</div>';

        if (isDone) {
          html += '<span class="block-tile-status block-tile-status-done" aria-label="done">' + CHECK_ICON + '</span>';
        } else if (isActive) {
          html += '<span class="block-tile-status block-tile-status-active" aria-label="active">' + PLAY_ICON + '</span>';
        }

        html += '</article>';
      });

      html += '</div></section>';
    });

    html += '</div>';
    return html;
  }

  function renderTable(rows, opts) {
    opts = opts || {};
    if (!rows || rows.length === 0) return "";
    const header = rows[0];
    const body = rows.slice(1);
    const doneSet = opts.doneSet || null;
    const activeSet = opts.activeSet || null;

    let html = '<div class="ai-table-wrap"><table>';
    html += "<thead><tr>";
    header.forEach(function (cell) { html += "<th>" + inlineFormat(cell) + "</th>"; });
    html += "</tr></thead>";

    if (body.length > 0) {
      html += "<tbody>";
      body.forEach(function (row) {
        const dayKey = row[0] || "";
        const timeKey = row[1] || "";
        const signature = (dayKey + "||" + timeKey).toLowerCase();
        let rowClass = "";
        if (doneSet && doneSet.has(signature)) rowClass = " block-done";
        else if (activeSet && activeSet.has(signature)) rowClass = " block-active";

        html += "<tr" + (rowClass ? ' class="' + rowClass.trim() + '"' : "") + ">";
        for (let i = 0; i < header.length; i++) {
          const cell = row[i] !== undefined ? row[i] : "";
          html += "<td>" + inlineFormat(cell) + "</td>";
        }
        html += "</tr>";
      });
      html += "</tbody>";
    }

    html += "</table></div>";
    return html;
  }

  function extractMarkdownTable(raw) {
    if (!raw) return null;
    const lines = String(raw).replace(/\r\n/g, "\n").split("\n");
    const rows = [];
    let started = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isRow = line.indexOf("|") >= 0;
      if (!started) {
        if (isRow && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
          rows.push(splitTableRow(line));
          i++;
          started = true;
        }
      } else {
        if (isRow) rows.push(splitTableRow(line));
        else break;
      }
    }
    return rows.length > 0 ? rows : null;
  }

  function formatAiText(raw) {
    if (!raw) return "";
    const lines = String(raw).replace(/\r\n/g, "\n").split("\n");
    const out = [];
    let paraBuf = [];
    let tableBuf = [];

    function flushPara() {
      if (paraBuf.length === 0) return;
      const text = paraBuf.join(" ").trim();
      if (text) out.push("<p>" + inlineFormat(text) + "</p>");
      paraBuf = [];
    }
    function flushTable() {
      if (tableBuf.length === 0) return;
      out.push(renderDayTiles(tableBuf));
      tableBuf = [];
    }
    function looksLikeTableRow(line) {
      const s = line.trim();
      if (s.indexOf("|") < 0) return false;
      const pipes = (s.match(/\|/g) || []).length;
      return pipes >= 2 || (s.startsWith("|") && s.endsWith("|"));
    }

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].replace(/\s+$/, "");
      const trimmed = rawLine.trim();

      if (tableBuf.length === 0) {
        if (looksLikeTableRow(rawLine) && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
          flushPara();
          tableBuf.push(splitTableRow(rawLine));
          i++;
          continue;
        }
      } else {
        if (looksLikeTableRow(rawLine)) {
          tableBuf.push(splitTableRow(rawLine));
          continue;
        } else {
          flushTable();
        }
      }

      if (!trimmed) { flushPara(); continue; }

      if (/^([-*_])\1{2,}$/.test(trimmed)) {
        flushPara();
        out.push("<hr>");
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
      if (headingMatch) {
        flushPara();
        const level = Math.min(headingMatch[1].length, 4);
        if (level <= 2) out.push("<h2>" + inlineFormat(headingMatch[2]) + "</h2>");
        else out.push("<h3>" + inlineFormat(headingMatch[2]) + "</h3>");
        continue;
      }

      const bulletMatch = rawLine.match(/^\s*[-*+•]\s+(.+)$/);
      if (bulletMatch) { flushPara(); out.push("<p>" + inlineFormat(bulletMatch[1]) + "</p>"); continue; }

      const orderedMatch = rawLine.match(/^\s*(\d+)[.)]\s+(.+)$/);
      if (orderedMatch) { flushPara(); out.push("<p>" + inlineFormat(orderedMatch[2]) + "</p>"); continue; }

      const letteredMatch = rawLine.match(/^\s*[a-zA-Z][).]\s+(.+)$/);
      if (letteredMatch) { flushPara(); out.push("<p>" + inlineFormat(letteredMatch[1]) + "</p>"); continue; }

      const boldOnly = trimmed.match(/^\*\*(.+)\*\*$/);
      if (boldOnly) { flushPara(); out.push('<span class="ai-day">' + inlineFormat(boldOnly[1]) + "</span>"); continue; }

      paraBuf.push(trimmed);
    }

    flushPara();
    flushTable();
    return out.join("");
  }

  /* ============================================================
     TIMETABLE TAB
     ============================================================ */
  function buildSignatureSets() {
    const active = readBridgeBlock();
    const progress = readProgressList();
    const activeSet = new Set();
    const doneSet = new Set();
    if (active) {
      const sig = ((active.day || "") + "||" + (active.timeBlock || "")).toLowerCase();
      if (sig !== "||") activeSet.add(sig);
    }
    progress.forEach(function (p) {
      const sig = ((p.day || "") + "||" + (p.timeBlock || "")).toLowerCase();
      if (sig !== "||") doneSet.add(sig);
    });
    return { activeSet: activeSet, doneSet: doneSet };
  }

  function renderTimetable(rawResponse, userMessage) {
    const rows = extractMarkdownTable(rawResponse);
    if (!rows || rows.length === 0) return false;

    const userAsked = looksLikeScheduleRequest(userMessage);
    const hasExisting = !!localStorage.getItem(TIMETABLE_KEY);
    if (!userAsked && hasExisting) return false;

    const header = rows[0].map(function (c) { return (c || "").toLowerCase(); });
    const idxTime = header.indexOf("time block");
    const idxAction = header.indexOf("action plan");
    const idxSubject = header.indexOf("subject / topic");

    const problems = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const timeCell = idxTime >= 0 ? r[idxTime] : "";
      const actionCell = idxAction >= 0 ? r[idxAction] : "";
      const subjectCell = idxSubject >= 0 ? r[idxSubject] : "";
      if (timeCell && !looksLikeTimeBlock(timeCell)) {
        problems.push('row ' + i + ': time "' + timeCell + '" is not HH:MM - HH:MM');
      }
      if (actionCell && !looksLikeSectionId(actionCell) && !looksLikeSectionId(subjectCell)) {
        problems.push("row " + i + ": no section identifier");
      }
    }

    const sigs = buildSignatureSets();
    aiTimetableContent.innerHTML = renderDayTiles(rows, { doneSet: sigs.doneSet, activeSet: sigs.activeSet });
    aiTimetableContent.style.display = "block";
    aiTimetableEmpty.style.display = "none";
    try { localStorage.setItem(TIMETABLE_KEY, JSON.stringify(rows)); } catch (e) {}

    if (problems.length > 0 && typeof appendAiMessage === "function") {
      const warn =
        currentLanguage() === "en"
          ? "Heads-up: the plan I just generated has a couple of formatting issues, so the Pomodoro durations may fall back to 25 min. Ask me to regenerate the plan and I will fix the time blocks and section references."
          : "Let op: het plan dat ik net heb gemaakt heeft een paar opmaakproblemen, dus de Pomodoro-duur valt misschien terug op 25 min. Vraag me om het plan opnieuw te maken en ik zet de tijdblokken en secties goed.";
      appendAiMessage("<p>" + escapeHtml(warn) + "</p>");
    }

    // Fire a global event so the inline page script can re-render the
    // study plan card, recommendation block, and Pomodoro bridge without
    // waiting for a manual refresh.
    try {
      window.dispatchEvent(new CustomEvent('studystack:ai-plan-updated', {
        detail: { rows: rows, userMessage: userMessage || '' }
      }));
    } catch (e) {}

    return true;
  }

  function renderTimetableFromCache() {
    try {
      const raw = localStorage.getItem(TIMETABLE_KEY);
      if (!raw) return false;
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || rows.length === 0) return false;
      const sigs = buildSignatureSets();
      aiTimetableContent.innerHTML = renderDayTiles(rows, { doneSet: sigs.doneSet, activeSet: sigs.activeSet });
      aiTimetableContent.style.display = "block";
      aiTimetableEmpty.style.display = "none";
      return true;
    } catch (e) { return false; }
  }

  /* ============================================================
     BRIDGE STRIP
     ============================================================ */
  function renderBridge() {
    const block = readBridgeBlock();
    if (!block) {
      aiBridge.classList.remove("show");
      return;
    }
    const parts = [];
    if (block.timeBlock) parts.push(block.timeBlock);
    if (block.subject) parts.push(block.subject);
    if (block.action) parts.push(block.action);
    aiBridgeValue.textContent = parts.join(" · ") || "—";
    aiBridge.classList.add("show");
  }

  function clearBridge() {
    writeBridgeBlock(null);
    renderBridge();
    renderTimetableFromCache();
  }

  function setBridge(block) {
    writeBridgeBlock(block);
    renderBridge();
    renderTimetableFromCache();
    // Notify the page so the study plan card refreshes immediately
    try {
      window.dispatchEvent(new CustomEvent('studystack:bridge-changed'));
    } catch (e) {}
  }

  function findFirstAvailableBlock() {
    try {
      const raw = localStorage.getItem(TIMETABLE_KEY);
      if (!raw) return null;
      const rows = JSON.parse(raw);
      if (!Array.isArray(rows) || rows.length < 2) return null;
      const header = rows[0].map(function (c) { return (c || "").toLowerCase(); });
      const idxDay = header.indexOf("day / date");
      const idxTime = header.indexOf("time block");
      const idxSubj = header.indexOf("subject / topic");
      const idxAct = header.indexOf("action plan");
      const sigs = buildSignatureSets();

      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        const day = idxDay >= 0 ? r[idxDay] : "";
        const timeBlock = idxTime >= 0 ? r[idxTime] : "";
        const subject = idxSubj >= 0 ? r[idxSubj] : "";
        const action = idxAct >= 0 ? r[idxAct] : "";
        const sig = ((day || "") + "||" + (timeBlock || "")).toLowerCase();
        if (sigs.doneSet.has(sig)) continue;
        if (sigs.activeSet.has(sig)) continue;
        const minutes = minutesFromTimeBlock(timeBlock) || 25;
        return {
          id: "b_" + Math.random().toString(36).slice(2, 9),
          day: day, timeBlock: timeBlock, subject: subject, action: action,
          minutes: minutes, startedAt: Date.now(), source: "ai"
        };
      }
      const r = rows[1];
      const day = idxDay >= 0 ? r[idxDay] : "";
      const timeBlock = idxTime >= 0 ? r[idxTime] : "";
      const subject = idxSubj >= 0 ? r[idxSubj] : "";
      const action = idxAct >= 0 ? r[idxAct] : "";
      return {
        id: "b_" + Math.random().toString(36).slice(2, 9),
        day: day, timeBlock: timeBlock, subject: subject, action: action,
        minutes: minutesFromTimeBlock(timeBlock) || 25,
        startedAt: Date.now(), source: "ai"
      };
    } catch (e) { return null; }
  }

  window.studystackRefreshBridge = renderBridge;
  window.studystackRefreshProgress = renderCompletedStrip;
  window.studystackSetBridge = setBridge;

  if (aiBridgeClear) {
    aiBridgeClear.addEventListener("click", function() { clearBridge(); });
  }
  if (aiBridgeStart) {
    aiBridgeStart.addEventListener("click", function() {
      let block = readBridgeBlock();
      if (!block) block = findFirstAvailableBlock();
      if (!block) {
        appendAiMessage("<p>" + escapeHtml(
          currentLanguage() === "en"
            ? "No study plan yet. Ask me for a plan first."
            : "Nog geen studieplan. Vraag me eerst om een plan."
        ) + "</p>");
        return;
      }
      if (typeof window.studystackStartAiBlock === "function") {
        window.studystackStartAiBlock(block);
      }
    });
  }

  /* ============================================================
     COMPLETED STRIP
     ============================================================ */
  function renderCompletedStrip() {
    const list = readProgressList();
    if (list.length === 0) {
      aiCompleted.classList.remove("show");
      return;
    }
    aiCompletedCount.textContent = String(list.length);
    aiCompleted.classList.add("show");
  }

  if (aiCompletedClear) {
    aiCompletedClear.addEventListener("click", function() {
      writeProgressList([]);
      renderCompletedStrip();
      renderTimetableFromCache();
    });
  }

  /* ============================================================
     TABS
     ============================================================ */
  function setAiTab(name) {
    aiTabs.forEach(function (tab) {
      const isActive = tab.dataset.aiTab === name;
      tab.classList.toggle("active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    Object.keys(aiPanels).forEach(function (k) {
      if (!aiPanels[k]) return;
      aiPanels[k].classList.toggle("active", k === name);
    });
  }
  aiTabs.forEach(function (tab) {
    tab.addEventListener("click", function() { setAiTab(tab.dataset.aiTab); });
  });

  /* ============================================================
     FOCUS TOGGLE
     ============================================================ */
  function reflectFocusToggle() {
    if (!aiFocusToggle) return;
    const focus = getFocusPreference();
    aiFocusToggle.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.focus === focus);
    });
  }
  if (aiFocusToggle) {
    aiFocusToggle.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function() {
        setFocusPreference(b.dataset.focus);
        reflectFocusToggle();
      });
    });
  }

  /* ============================================================
     UI FLOW
     ============================================================ */
  let busy = false;
  let loadingMessageTimer = null;
  let loadingMessageIndex = 0;

  function getLoadingMessages() {
    return currentLanguage() === "en"
      ? ["Reading your plan…", "Building a schedule…", "Almost there…", "Finishing up…"]
      : ["Je plan lezen…", "Rooster opbouwen…", "Bijna klaar…", "Afronden…"];
  }

  function cycleLoadingMessage() {
    const sub = document.querySelector(".ai-loading-sub");
    if (!sub) return;
    const messages = getLoadingMessages();
    sub.textContent = messages[loadingMessageIndex % messages.length];
    loadingMessageIndex++;
  }

  function setBusy(isBusy) {
    busy = isBusy;
    aiButton.disabled = isBusy;
    if (aiInput) aiInput.disabled = isBusy;
    if (aiLoading) aiLoading.classList.toggle("show", isBusy);

    if (loadingMessageTimer) {
      clearInterval(loadingMessageTimer);
      loadingMessageTimer = null;
    }

    if (isBusy) {
      loadingMessageIndex = 0;
      cycleLoadingMessage();
      loadingMessageTimer = setInterval(cycleLoadingMessage, 2200);
    } else {
      const sub = document.querySelector(".ai-loading-sub");
      if (sub) sub.textContent = "DeepSeek V3.2 is processing your message…";
    }
  }

  async function onClick() {
    if (busy) return;
    const userRequest = aiInput.value.trim();
    if (!userRequest) { aiInput.focus(); return; }

    appendUserMessage(userRequest);
    aiInput.value = "";
    aiInput.style.height = "auto";

    const bubble = appendAiMessage("");
    const contentEl = bubble.querySelector(".ai-content");
    setBusy(true);
    let accumulated = "";

    try {
      const fullText = await generatePlanStream(userRequest, function (delta) {
        accumulated += delta;
        contentEl.innerHTML = formatAiText(accumulated);
        scrollFeedToBottom();
      });

      setBusy(false);
      const cleaned = postProcessResponse(fullText);
      contentEl.innerHTML = formatAiText(cleaned);
      scrollFeedToBottom();

      // ---- Save both turns to memory ----
      appendConversationTurn("user", userRequest);
      appendConversationTurn("assistant", cleaned);

      const updated = renderTimetable(cleaned, userRequest);
      if (updated) {
        try { localStorage.setItem(OUTPUT_KEY, cleaned); } catch (e) {}
        const first = findFirstAvailableBlock();
        if (first) setBridge(first);
      }
    } catch (err) {
      setBusy(false);
      try { console.warn("AI Planner error:", err); } catch (e) {}
      const isNoKey = err && err.message === "NO_KEY";
      const errMsg = isNoKey
        ? (currentLanguage() === "en"
            ? "No API key configured. Ask the site owner to add an OpenRouter key in planner.js."
            : "Geen API-sleutel ingesteld. Vraag de beheerder om een OpenRouter-sleutel in planner.js te plaatsen.")
        : (currentLanguage() === "en"
            ? "Something went wrong while generating the plan. Please try again."
            : "Er ging iets mis bij het genereren van het plan. Probeer het opnieuw.");
      contentEl.innerHTML = "<p>" + escapeHtml(errMsg) + "</p>";
    }
  }

  /* ============================================================
     API CALL
     ============================================================ */
  async function generatePlanStream(userRequest, onDelta) {
    if (!PROXY_URL || PROXY_URL.indexOf("timely-dasik") === -1) {
      throw new Error("NO_KEY");
    }

    const body = {
      model: MODEL,
      messages: buildMessages(userRequest),   // ← now includes memory
      temperature: 0.4,
      stream: true,
      reasoning: { effort: "low" },
      provider: {
        sort: "throughput",
        preferred_max_latency: { p90: 3 }
      }
    };
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      const errText = await response.text().catch(function () { return ""; });
      throw new Error("HTTP " + response.status + " " + errText);
    }
    if (!response.body) throw new Error("NO_STREAM");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let sseBuffer = "";
    let fullText = "";

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      sseBuffer += decoder.decode(result.value, { stream: true });
      const frames = sseBuffer.split(/\n\n/);
      sseBuffer = frames.pop() || "";

      for (let i = 0; i < frames.length; i++) {
        const lines = frames[i].split(/\n/);
        for (let j = 0; j < lines.length; j++) {
          const line = lines[j].trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          let json;
          try { json = JSON.parse(payload); } catch (e) { continue; }
          const delta = json && json.choices && json.choices[0] && json.choices[0].delta &&
            typeof json.choices[0].delta.content === "string" ? json.choices[0].delta.content : "";
          if (delta) {
            fullText += delta;
            if (typeof onDelta === "function") onDelta(delta);
          }
        }
      }
    }

    if (!fullText.trim()) throw new Error("EMPTY");
    return fullText.trim();
  }

  async function generatePlan(userRequest) {
    return generatePlanStream(userRequest, null);
  }

  /* ============================================================
     POST-PROCESSING: enforce rules the model may have skipped
     ============================================================ */
  function enforceEmojiRule(text) {
    if (!text) return text;
    if (extractMarkdownTable(text)) return text;
    const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u.test(text);
    if (hasEmoji) return text;
    return text + " ✨";
  }

  function stripLetteredPrefixes(text) {
    if (!text) return text;
    return String(text).replace(/(^|\n)\s*[a-zA-Z][).]\s+/g, "$1");
  }

  function normalizeTimeBlocksInTable(rows) {
    if (!Array.isArray(rows) || rows.length === 0) return rows;
    const header = rows[0].map(function (c) { return (c || "").toLowerCase(); });
    const idxTime = header.indexOf("time block");
    if (idxTime < 0) return rows;
    for (let i = 1; i < rows.length; i++) {
      const cell = rows[i][idxTime];
      if (!cell) continue;
      const m = String(cell).match(/(\d{1,2}):(\d{1,2})\s*[-–—]\s*(\d{1,2}):(\d{1,2})/);
      if (!m) continue;
      const pad = function (n) { return String(parseInt(n, 10)).padStart(2, "0"); };
      rows[i][idxTime] = pad(m[1]) + ":" + pad(m[2]) + " - " + pad(m[3]) + ":" + pad(m[4]);
    }
    return rows;
  }

  function postProcessResponse(raw) {
    if (!raw) return raw;
    let out = stripLetteredPrefixes(raw);
    const table = extractMarkdownTable(out);
    if (table) {
      normalizeTimeBlocksInTable(table);
      const lines = out.replace(/\r\n/g, "\n").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const isRow = line.indexOf("|") >= 0;
        if (!isRow || i + 1 >= lines.length || !isTableSeparator(lines[i + 1])) continue;
        const rebuilt = table.map(function (row) { return "| " + row.join(" | ") + " |"; });
        const separator = lines[i + 1];
        let endIdx = i + 2;
        while (endIdx < lines.length && lines[endIdx].trim().indexOf("|") >= 0) endIdx++;
        lines.splice.apply(lines, [i, endIdx - i].concat([rebuilt[0], separator].concat(rebuilt.slice(1))));
        break;
      }
      out = lines.join("\n");
    }
    return enforceEmojiRule(out);
  }

  /* ============================================================
     FEED
     ============================================================ */
  function scrollFeedToBottom() {
    try { aiFeed.scrollTop = aiFeed.scrollHeight; } catch (e) {}
  }
  function appendUserMessage(text) {
    const wrap = document.createElement("div");
    wrap.className = "ai-msg ai-msg-user";
    wrap.innerHTML =
      '<div class="ai-avatar" aria-hidden="true">' + ICON_USER + "</div>" +
      '<div class="ai-bubble">' + escapeHtml(text) + "</div>";
    aiFeed.appendChild(wrap);
    scrollFeedToBottom();
  }
  function appendAiMessage(htmlContent) {
    const wrap = document.createElement("div");
    wrap.className = "ai-msg ai-msg-ai";
    wrap.innerHTML =
      '<div class="ai-avatar" aria-hidden="true">' + ICON_AI + "</div>" +
      '<div class="ai-bubble"><div class="ai-content">' + (htmlContent || "") + "</div></div>";
    aiFeed.appendChild(wrap);
    scrollFeedToBottom();
    return wrap;
  }

  aiButton.addEventListener("click", onClick);
  aiInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onClick(); }
  });
  aiInput.addEventListener("input", function () {
    aiInput.style.height = "auto";
    aiInput.style.height = Math.min(aiInput.scrollHeight, 140) + "px";
  });

  /* ============================================================
     RESTORE ON LOAD
     ============================================================ */
  try {
    const history = readConversationHistory();
    if (history.length > 0) {
      history.forEach(function (entry) {
        if (entry.role === "user") appendUserMessage(entry.content);
        else appendAiMessage(formatAiText(entry.content));
      });
    } else {
      // No memory yet — fall back to the cached last output if present
      const last = localStorage.getItem(OUTPUT_KEY);
      if (last && last.trim()) appendAiMessage(formatAiText(last));
    }
  } catch (e) {}

  renderTimetableFromCache();
  renderBridge();
  renderCompletedStrip();
  reflectFocusToggle();

  if (!readBridgeBlock()) {
    const first = findFirstAvailableBlock();
    if (first) setBridge(first);
  }

  window.studystackFormatAiText = formatAiText;
  window.studystackExtractMarkdownTable = extractMarkdownTable;
  window.studystackResetAiPlanner = function () {
    if (aiFeed) aiFeed.innerHTML = "";
    try {
      localStorage.removeItem(OUTPUT_KEY);
      localStorage.removeItem(TIMETABLE_KEY);
      localStorage.removeItem(BRIDGE_KEY);
      localStorage.removeItem(PROGRESS_KEY);
    } catch (e) {}
    if (aiTimetableContent) {
      aiTimetableContent.innerHTML = "";
      aiTimetableContent.style.display = "none";
    }
    if (aiTimetableEmpty) aiTimetableEmpty.style.display = "block";
    renderBridge();
    renderCompletedStrip();
  };

  /* ============================================================
     AI → UI BROADCAST
     When the timetable is updated, the Pomodoro bridge should be
     refreshed immediately AND the page's own plan card should
     reflect the new schedule without a reload.
     ============================================================ */
  window.addEventListener('studystack:ai-plan-updated', function () {
    renderBridge();
    renderTimetableFromCache();

    const first = findFirstAvailableBlock();
    if (first && !readBridgeBlock()) {
      setBridge(first);
    }
  });

  /* ============================================================
     MEMORY CONTROLS (exposed for the inline planner script)
     ============================================================ */
  window.studystackClearMemory = function () {
    clearConversationHistory();
    try { localStorage.removeItem(OUTPUT_KEY); } catch (e) {}
  };

  window.studystackGetMemoryTurnCount = getMemoryTurnCount;

  // Debug helpers (remove after confirming the homework bridge works)
  window.studystackReadHomework = readHomeworkFromStorage;
  window.studystackReadTests = readTestsFromStorage;

})();