/* ============================================================
   StudyStack — Flashcards (3-step recall system)
   Practice → Test → Mastered, batch of 3 at a time.
   Uses flip card + self-rating. No typing.
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = 'studystack-flashcards';
  const LANG_KEY = 'studystack-language';
  const BATCH_SIZE = 3;
  const MASTERY_THRESHOLD = 3;

  /* ============================================================
     TRANSLATIONS
     ============================================================ */
  const translations = {
    en: {
      "language.label": "Language",
      "fc.backHome": "Back to home",
      "fc.badge": "3-step recall · free",
      "fc.title": "Flashcards",
      "fc.heroText": "Create decks, paste your vocabulary, and learn in 3 steps: practice, test, master.",
      "fc.yourDecks": "Your decks",
      "fc.newDeck": "New deck",
      "fc.newDeckTitle": "New deck",
      "fc.editDeckTitle": "Edit deck",
      "fc.deckName": "Deck name",
      "fc.deckNamePh": "e.g. French Chapter 1",
      "fc.deckSubject": "Subject",
      "fc.deckSubjectPh": "e.g. French",
      "fc.deckTags": "Tags (comma-separated)",
      "fc.deckTagsPh": "e.g. chapter-1, week-2-test",
      "fc.deckTagsHint": "Optional. Use commas to separate multiple tags.",
      "fc.cancel": "Cancel",
      "fc.save": "Save",
      "fc.back": "Back",
      "fc.editDeck": "Edit",
      "fc.deleteDeck": "Delete",
      "fc.cards": "Cards",
      "fc.addCard": "Single card",
      "fc.addCardTitle": "Add card",
      "fc.editCardTitle": "Edit card",
      "fc.cardFront": "Front",
      "fc.cardFrontPh": "e.g. le chien",
      "fc.cardBack": "Back",
      "fc.cardBackPh": "e.g. the dog",
      "fc.modeFlip": "Start learning session",
      "fc.modeFlipDesc": "3-step recall: practice first, then test, then master.",
      "fc.progressLabel": "Progress",
      "fc.front": "Front",
      "fc.back": "Back",
      "fc.flipHint": "Click or press Space to flip",
      "fc.rateWrong": "Didn't know",
      "fc.rateWrongHint": "→ back to practice",
      "fc.rateGood": "Good",
      "fc.rateGoodHint": "+1 correct",
      "fc.rateEasy": "Easy",
      "fc.rateEasyHint": "+2 correct",
      "fc.exitStudy": "Stop",
      "fc.sessionDone": "Session complete!",
      "fc.sessionDoneText": "You've mastered every card in this deck.",
      "fc.backToDecks": "Back to decks",
      "fc.noDecks": "No decks yet",
      "fc.noDecksHint": "Create your first deck to get started.",
      "fc.noCards": "No cards in this deck yet",
      "fc.noCardsHint": "Paste some vocabulary above to add cards.",
      "fc.empty": "Empty deck",
      "fc.deckDue": "to study",
      "fc.deckCards": "cards",
      "fc.confirmDeleteDeck": "Delete this deck and all its cards? This cannot be undone.",
      "fc.confirmDeleteCard": "Delete this card?",
      "fc.noLearning": "This deck has no cards yet.",
      "fc.pasteTitle": "Paste your vocabulary",
      "fc.pasteHint": "One word per line, with a <strong>=</strong>, <strong>tab</strong>, or <strong>comma</strong> in between.",
      "fc.pastePlaceholder": "le chien = de hond\nle chat = de kat\nl'oiseau = de vogel",
      "fc.pasteAdd": "Add to deck",
      "fc.pasteReady": "cards ready",
      "fc.legendPractice": "Practice",
      "fc.legendTest": "Testing",
      "fc.legendMastered": "Mastered",
      "fc.legendExplainTitle": "How does this work?",
      "fc.legendExplainText": "Every card goes through <strong>3 steps</strong>. First you practise with the answer visible, then you test yourself by flipping, and after 3 correct recalls the card is <strong>mastered</strong>.",
      "fc.step1Title": "Step 1 · Practice",
      "fc.step1Desc": "Flip the card, read both sides, rate yourself.",
      "fc.step2Title": "Step 2 · Test",
      "fc.step2Desc": "See only the front, flip to check, rate your recall.",
      "fc.step3Title": "Step 3 · Mastered",
      "fc.step3Desc": "after 3 correct recalls. The card is done.",
      "fc.phasePractice": "Practice",
      "fc.phaseTest": "Test",
      "fc.phaseMastered": "Mastered",
      "fc.sessionProgress": "{done} of {total}"
    },
    nl: {
      "language.label": "Taal",
      "fc.backHome": "Terug naar startpagina",
      "fc.badge": "3-stappen · gratis",
      "fc.title": "Flashcards",
      "fc.heroText": "Maak kaartensets, plak je woordjes en leer in 3 stappen: oefenen, toetsen en beheersen.",
      "fc.yourDecks": "Jouw kaartensets",
      "fc.newDeck": "Nieuwe kaartenset",
      "fc.newDeckTitle": "Nieuwe kaartenset",
      "fc.editDeckTitle": "Kaartenset aanpassen",
      "fc.deckName": "Naam kaartenset",
      "fc.deckNamePh": "bijv. Frans H1",
      "fc.deckSubject": "Vak",
      "fc.deckSubjectPh": "bijv. Frans",
      "fc.deckTags": "Tags (komma-gescheiden)",
      "fc.deckTagsPh": "bijv. hoofdstuk-1, toets-week-2",
      "fc.deckTagsHint": "Optioneel. Gebruik komma's om meerdere tags te scheiden.",
      "fc.cancel": "Annuleren",
      "fc.save": "Opslaan",
      "fc.back": "Terug",
      "fc.editDeck": "Kaartenset aanpassen",
      "fc.deleteDeck": "Verwijderen",
      "fc.cards": "Kaarten",
      "fc.addCard": "Losse kaart",
      "fc.addCardTitle": "Kaart toevoegen",
      "fc.editCardTitle": "Kaart aanpassen",
      "fc.cardFront": "Voorkant",
      "fc.cardFrontPh": "bijv. le chien",
      "fc.cardBack": "Achterkant",
      "fc.cardBackPh": "bijv. de hond",
      "fc.modeFlip": "Start leersessie",
      "fc.modeFlipDesc": "3-stappen: eerst oefenen, dan toetsen, dan beheerst.",
      "fc.progressLabel": "Voortgang",
      "fc.front": "Voorkant",
      "fc.back": "Achterkant",
      "fc.flipHint": "Klik of druk op Space om te draaien",
      "fc.rateWrong": "Niet goed",
      "fc.rateWrongHint": "→ terug naar oefenen",
      "fc.rateGood": "Goed",
      "fc.rateGoodHint": "+1 goed",
      "fc.rateEasy": "Makkelijk",
      "fc.rateEasyHint": "+2 goed",
      "fc.exitStudy": "Stoppen",
      "fc.sessionDone": "Sessie klaar!",
      "fc.sessionDoneText": "Je beheerst nu alle kaarten in deze kaartenset.",
      "fc.backToDecks": "Terug naar kaartensets",
      "fc.noDecks": "Nog geen kaartensets",
      "fc.noDecksHint": "Maak je eerste kaartenset om te beginnen.",
      "fc.noCards": "Deze kaartenset bevat nog geen kaarten",
      "fc.noCardsHint": "Plak hierboven je woordjes om kaarten toe te voegen.",
      "fc.empty": "Lege kaartenset",
      "fc.deckDue": "te doen",
      "fc.deckCards": "kaarten",
      "fc.confirmDeleteDeck": "Deze kaartenset en alle kaarten verwijderen? Dit kan niet ongedaan worden gemaakt.",
      "fc.confirmDeleteCard": "Deze kaart verwijderen?",
      "fc.noLearning": "Deze kaartenset bevat nog geen kaarten.",
      "fc.pasteTitle": "Plak je woordjes",
      "fc.pasteHint": "Één woord per regel, met een <strong>=</strong>, <strong>tab</strong>, of <strong>komma</strong> ertussen.",
      "fc.pastePlaceholder": "le chien = de hond\nle chat = de kat\nl'oiseau = de vogel",
      "fc.pasteAdd": "Toevoegen aan kaartenset",
      "fc.pasteReady": "kaarten klaar",
      "fc.legendPractice": "Oefenen",
      "fc.legendTest": "Toetsen",
      "fc.legendMastered": "Beheerst",
      "fc.legendExplainTitle": "Hoe werkt dit?",
      "fc.legendExplainText": "Elke kaart doorloopt <strong>3 stappen</strong>. Eerst oefen je met het antwoord zichtbaar, daarna toets je jezelf door te draaien, en na 3 keer goed is de kaart <strong>beheerst</strong>.",
      "fc.step1Title": "Stap 1 · Oefenen",
      "fc.step1Desc": "Draai de kaart, lees beide kanten, beoordeel jezelf.",
      "fc.step2Title": "Stap 2 · Toetsen",
      "fc.step2Desc": "Zie alleen de voorkant, draai om te controleren, beoordeel jezelf.",
      "fc.step3Title": "Stap 3 · Beheerst",
      "fc.step3Desc": "na 3 keer goed. De kaart is klaar.",
      "fc.phasePractice": "Oefenen",
      "fc.phaseTest": "Toetsen",
      "fc.phaseMastered": "Beheerst",
      "fc.sessionProgress": "{done} van {total}"
    }
  };

  let currentLanguage = localStorage.getItem(LANG_KEY) || 'nl';
  function t(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.nl[key] || key;
  }
  function tFormat(key, values) {
    return t(key).replace(/\{(\w+)\}/g, function (m, n) {
      return values[n] === undefined ? m : values[n];
    });
  }
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ============================================================
     STATE
     ============================================================ */
  let state = { decks: [] };
  let activeDeckId = null;
  let activeSession = null;
  let isFlipped = false;

  /* ============================================================
     PERSISTENCE
     ============================================================ */
  function normalizeCard(c) {
    let phase = c.phase;
    let correctCount = Number(c.correctCount) || 0;
    if (!phase) {
      const oldBox = Math.max(1, Math.min(5, Number(c.box) || 1));
      if (oldBox >= 5) { phase = 'mastered'; correctCount = MASTERY_THRESHOLD; }
      else if (oldBox >= 2) { phase = 'test'; correctCount = oldBox - 1; }
      else { phase = 'practice'; correctCount = 0; }
    }
    if (phase !== 'practice' && phase !== 'test' && phase !== 'mastered') phase = 'practice';
    correctCount = Math.max(0, Math.min(MASTERY_THRESHOLD, correctCount));
    return {
      id: c.id || ('c_' + Math.random().toString(36).slice(2, 9)),
      front: String(c.front || '').trim(),
      back: String(c.back || '').trim(),
      phase: phase,
      correctCount: correctCount,
      createdAt: Number(c.createdAt) || Date.now()
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { state = { decks: [] }; return; }
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.decks)) {
        state.decks = parsed.decks.map(function (d) {
          return {
            id: d.id || ('d_' + Math.random().toString(36).slice(2, 9)),
            name: String(d.name || '').trim() || 'Untitled',
            subject: String(d.subject || '').trim(),
            tags: Array.isArray(d.tags) ? d.tags.filter(Boolean) : [],
            createdAt: Number(d.createdAt) || Date.now(),
            cards: Array.isArray(d.cards) ? d.cards.map(normalizeCard).filter(function (c) { return c.front || c.back; }) : []
          };
        });
      }
    } catch (e) { state = { decks: [] }; }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ============================================================
     HELPERS
     ============================================================ */
  function getDeck(id) { return state.decks.find(function (d) { return d.id === id; }) || null; }
  function getCard(deck, id) { return deck ? deck.cards.find(function (c) { return c.id === id; }) : null; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
  }

  function deckPhaseCounts(deck) {
    let practice = 0, test = 0, mastered = 0;
    deck.cards.forEach(function (c) {
      if (c.phase === 'mastered') mastered++;
      else if (c.phase === 'test') test++;
      else practice++;
    });
    return { practice: practice, test: test, mastered: mastered, total: deck.cards.length };
  }

  function updateProgressBar() {
    if (!activeSession) return;
    const deck = getDeck(activeSession.deckId);
    if (!deck) return;

    const counts = deckPhaseCounts(deck);
    const total = counts.total || 1;

    const segP = document.getElementById('fc-seg-practice');
    const segT = document.getElementById('fc-seg-test');
    const segM = document.getElementById('fc-seg-mastered');
    const cEl = document.getElementById('fc-progress-count');
    const lP = document.getElementById('fc-legend-practice');
    const lT = document.getElementById('fc-legend-test');
    const lM = document.getElementById('fc-legend-mastered');

    if (segP) segP.style.width = ((counts.practice / total) * 100) + '%';
    if (segT) segT.style.width = ((counts.test / total) * 100) + '%';
    if (segM) segM.style.width = ((counts.mastered / total) * 100) + '%';

    if (cEl) cEl.textContent = counts.mastered + ' / ' + counts.total;
    if (lP) lP.textContent = String(counts.practice);
    if (lT) lT.textContent = String(counts.test);
    if (lM) lM.textContent = String(counts.mastered);
  }

  function switchView(view) {
    document.querySelectorAll('.deck-view').forEach(function (v) { v.classList.remove('active'); });
    const target = document.getElementById('view-' + view);
    if (target) target.classList.add('active');
  }

  /* ============================================================
     RENDER: DECK GRID
     ============================================================ */
  function renderDeckGrid() {
    const grid = document.getElementById('deck-grid');
    grid.innerHTML = '';

    if (state.decks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.style.gridColumn = '1 / -1';
      empty.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6"></path><path d="M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c3 3 9 3 12 0v-5"></path></svg>' +
        '<h3>' + t('fc.noDecks') + '</h3>' +
        '<p>' + t('fc.noDecksHint') + '</p>';
      grid.appendChild(empty);
      return;
    }

    state.decks.forEach(function (deck) {
      const counts = deckPhaseCounts(deck);
      const card = document.createElement('a');
      card.className = 'deck-card';
      card.href = '#';
      card.dataset.deckId = deck.id;

      const tagsHTML = deck.tags.length > 0
        ? '<div class="deck-tags">' + deck.tags.map(function (tag) {
            return '<span class="deck-tag">' + escapeHtml(tag) + '</span>';
          }).join('') + '</div>'
        : '';

      const subjectPill = deck.subject
        ? '<span class="deck-subject-pill">' + escapeHtml(deck.subject) + '</span>'
        : '<span class="deck-subject-pill" style="background:#F8FAFC;color:#64748B;border-color:#E2E8F0;">—</span>';

      const remaining = counts.practice + counts.test;
      card.innerHTML =
        '<div class="deck-card-head">' + subjectPill + '</div>' +
        '<h3>' + escapeHtml(deck.name) + '</h3>' +
        tagsHTML +
        '<div class="deck-meta">' +
          '<span class="deck-meta-item">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M9 3v18"></path></svg>' +
            '<strong>' + counts.total + '</strong> ' + t('fc.deckCards') +
          '</span>' +
          '<span class="deck-meta-item' + (remaining > 0 ? ' due' : '') + '">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>' +
            '<strong>' + remaining + '</strong> ' + t('fc.deckDue') +
          '</span>' +
        '</div>';

      card.addEventListener('click', function (e) {
        e.preventDefault();
        openDeck(deck.id);
      });

      grid.appendChild(card);
    });
  }

  /* ============================================================
     RENDER: DECK DETAIL
     ============================================================ */
  function renderDeckDetail() {
    const deck = getDeck(activeDeckId);
    if (!deck) { switchView('decks'); return; }

    const counts = deckPhaseCounts(deck);
    document.getElementById('deck-title').textContent = deck.name;

    const subjectEl = document.getElementById('deck-subject');
    if (deck.subject) { subjectEl.textContent = deck.subject; subjectEl.style.display = ''; }
    else subjectEl.style.display = 'none';

    const statsText = counts.total + ' ' + t('fc.deckCards')
      + ' · ' + counts.practice + ' ' + t('fc.phasePractice').toLowerCase()
      + ' · ' + counts.test + ' ' + t('fc.phaseTest').toLowerCase()
      + ' · ' + counts.mastered + ' ' + t('fc.phaseMastered').toLowerCase();
    document.getElementById('deck-stats').textContent = statsText;

    const remaining = counts.practice + counts.test;
    const flipCount = document.getElementById('flip-count');
    if (flipCount) flipCount.textContent = remaining + ' ' + t('fc.deckDue');

    // When the deck is empty, hide the study-mode card so the paste
    // textarea is the first thing the user sees. It reappears the
    // moment a card is added.
    const studyModesEl = document.querySelector('.study-modes');
    if (studyModesEl) {
      studyModesEl.style.display = deck.cards.length === 0 ? 'none' : '';
    }

    const lp = document.getElementById('legend-practice-count');
    const lt = document.getElementById('legend-test-count');
    const lm = document.getElementById('legend-mastered-count');
    if (lp) lp.textContent = String(counts.practice);
    if (lt) lt.textContent = String(counts.test);
    if (lm) lm.textContent = String(counts.mastered);

    const list = document.getElementById('card-list');
    list.innerHTML = '';

    if (deck.cards.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M3 9h18"></path><path d="M9 3v18"></path></svg>' +
        '<h3>' + t('fc.noCards') + '</h3>' +
        '<p>' + t('fc.noCardsHint') + '</p>';
      list.appendChild(empty);
      return;
    }

    deck.cards.forEach(function (card) {
      const row = document.createElement('div');
      row.className = 'card-row';

      const badgeClass = card.phase === 'mastered' ? 'box-5'
                      : card.phase === 'test' ? 'box-3'
                      : 'box-1';
      const badgeText = card.phase === 'mastered' ? '✓'
                      : card.phase === 'test' ? String(card.correctCount) + '/3'
                      : 'P';

      row.innerHTML =
        '<span class="card-box-badge ' + badgeClass + '" title="' + escapeHtml(t('fc.phase' + card.phase.charAt(0).toUpperCase() + card.phase.slice(1))) + '">' + badgeText + '</span>' +
        '<div class="card-row-text">' +
          '<div class="card-row-front">' + escapeHtml(card.front || '—') + '</div>' +
          '<div class="card-row-back">' + escapeHtml(card.back || '—') + '</div>' +
        '</div>' +
        '<div class="card-row-actions">' +
          '<button class="btn btn-ghost" data-action="edit" aria-label="Edit">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>' +
          '</button>' +
          '<button class="btn btn-ghost" data-action="delete" aria-label="Delete">' +
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>' +
          '</button>' +
        '</div>';

      row.querySelector('[data-action="edit"]').addEventListener('click', function () {
        openCardModal(card.id);
      });
      row.querySelector('[data-action="delete"]').addEventListener('click', function () {
        if (!window.confirm(t('fc.confirmDeleteCard'))) return;
        deck.cards = deck.cards.filter(function (c) { return c.id !== card.id; });
        save();
        renderDeckDetail();
        renderDeckGrid();
      });

      list.appendChild(row);
    });
  }

  /* ============================================================
     DECK MODAL
     ============================================================ */
  let editingDeckId = null;

  function openDeckModal(deckId) {
    editingDeckId = deckId || null;
    const modal = document.getElementById('modal-deck');
    const title = document.getElementById('modal-deck-title');
    const nameInput = document.getElementById('deck-name');
    const subjectInput = document.getElementById('deck-subject-input');
    const tagsInput = document.getElementById('deck-tags');

    if (deckId) {
      const deck = getDeck(deckId);
      if (!deck) return;
      title.textContent = t('fc.editDeckTitle');
      nameInput.value = deck.name;
      subjectInput.value = deck.subject;
      tagsInput.value = deck.tags.join(', ');
    } else {
      title.textContent = t('fc.newDeckTitle');
      nameInput.value = '';
      subjectInput.value = '';
      tagsInput.value = '';
    }

    modal.classList.add('active');
    setTimeout(function () { nameInput.focus(); }, 100);
  }

  function closeDeckModal() {
    document.getElementById('modal-deck').classList.remove('active');
    editingDeckId = null;
  }

  function saveDeckModal() {
    const name = document.getElementById('deck-name').value.trim();
    if (!name) return;
    const subject = document.getElementById('deck-subject-input').value.trim();
    const tags = document.getElementById('deck-tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    let newDeckId = null;

    if (editingDeckId) {
      const deck = getDeck(editingDeckId);
      if (deck) { deck.name = name; deck.subject = subject; deck.tags = tags; }
    } else {
      newDeckId = 'd_' + Math.random().toString(36).slice(2, 9);
      state.decks.unshift({
        id: newDeckId,
        name: name, subject: subject, tags: tags,
        createdAt: Date.now(), cards: []
      });
    }

    save();
    closeDeckModal();
    renderDeckGrid();

    if (newDeckId) {
      // Brand new deck — jump straight into it and put the cursor
      // in the paste-vocabulary textarea so the user can add words
      // without an extra click.
      openDeck(newDeckId);
      setTimeout(function () {
        const ta = document.getElementById('paste-textarea');
        if (ta) {
          try { ta.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          ta.focus();
        }
      }, 260);
    } else if (activeDeckId) {
      renderDeckDetail();
    }
  }

  /* ============================================================
     CARD MODAL
     ============================================================ */
  let editingCardId = null;

  function openCardModal(cardId) {
    editingCardId = cardId || null;
    const deck = getDeck(activeDeckId);
    if (!deck) return;

    const modal = document.getElementById('modal-card');
    const title = document.getElementById('modal-card-title');
    const front = document.getElementById('card-front');
    const back = document.getElementById('card-back');

    if (cardId) {
      const card = getCard(deck, cardId);
      if (!card) return;
      title.textContent = t('fc.editCardTitle');
      front.value = card.front;
      back.value = card.back;
    } else {
      title.textContent = t('fc.addCardTitle');
      front.value = '';
      back.value = '';
    }

    modal.classList.add('active');
    setTimeout(function () { front.focus(); }, 100);
  }

  function closeCardModal() {
    document.getElementById('modal-card').classList.remove('active');
    editingCardId = null;
  }

  function saveCardModal() {
    const deck = getDeck(activeDeckId);
    if (!deck) return;
    const front = document.getElementById('card-front').value.trim();
    const back = document.getElementById('card-back').value.trim();
    if (!front && !back) return;

    if (editingCardId) {
      const card = getCard(deck, editingCardId);
      if (card) { card.front = front; card.back = back; }
    } else {
      deck.cards.push({
        id: 'c_' + Math.random().toString(36).slice(2, 9),
        front: front, back: back,
        phase: 'practice', correctCount: 0,
        createdAt: Date.now()
      });
    }
    save();
    closeCardModal();
    renderDeckDetail();
    renderDeckGrid();
  }

  /* ============================================================
     PASTE AREA
     ============================================================ */
  function parseDelimited(text) {
    if (!text) return [];
    const out = [];
    const lines = String(text).split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      let parts = null;
      const eq = line.indexOf('=');
      if (eq >= 0) {
        parts = [line.slice(0, eq), line.slice(eq + 1)];
      } else {
        const tab = line.indexOf('\t');
        if (tab >= 0) {
          parts = [line.slice(0, tab), line.slice(tab + 1)];
        } else {
          const comma = line.indexOf(',');
          if (comma >= 0) parts = [line.slice(0, comma), line.slice(comma + 1)];
        }
      }
      if (!parts) continue;
      const front = parts[0].trim();
      const back = parts[1].trim();
      if (!front && !back) continue;
      out.push({ front: front, back: back });
    }
    return out;
  }

  function updatePasteCount() {
    const ta = document.getElementById('paste-textarea');
    const countEl = document.getElementById('paste-count');
    if (!ta || !countEl) return;
    const pairs = parseDelimited(ta.value);
    if (pairs.length === 0) { countEl.innerHTML = ''; return; }
    countEl.innerHTML = '<strong>' + pairs.length + '</strong> ' + t('fc.pasteReady');
  }

  function addPastedCards() {
    const deck = getDeck(activeDeckId);
    if (!deck) return;
    const ta = document.getElementById('paste-textarea');
    if (!ta) return;
    const pairs = parseDelimited(ta.value);
    if (pairs.length === 0) { window.alert(t('fc.importEmpty')); return; }

    pairs.forEach(function (p) {
      deck.cards.push({
        id: 'c_' + Math.random().toString(36).slice(2, 9),
        front: p.front, back: p.back,
        phase: 'practice', correctCount: 0,
        createdAt: Date.now()
      });
    });
    save();
    ta.value = '';
    updatePasteCount();
    renderDeckDetail();
    renderDeckGrid();
  }

  /* ============================================================
     OPEN DECK
     ============================================================ */
  function openDeck(deckId) {
    activeDeckId = deckId;
    const ta = document.getElementById('paste-textarea');
    if (ta) ta.value = '';
    const countEl = document.getElementById('paste-count');
    if (countEl) countEl.innerHTML = '';
    switchView('deck');
    renderDeckDetail();
  }

  /* ============================================================
     STUDY SESSION — 3-step system
     ============================================================ */
  function startStudy() {
    const deck = getDeck(activeDeckId);
    if (!deck) return;
    if (deck.cards.length === 0) { window.alert(t('fc.noLearning')); return; }

    const testCards = deck.cards.filter(function (c) { return c.phase === 'test'; }).map(function (c) { return c.id; });
    const practiceCards = deck.cards.filter(function (c) { return c.phase === 'practice'; }).map(function (c) { return c.id; });
    shuffle(practiceCards);
    shuffle(testCards);

    activeSession = {
      deckId: deck.id,
      pendingIds: practiceCards,
      batchIds: [],
      practiceQueue: [],
      testQueue: testCards,
      currentCardId: null,
      doneInSession: 0,
      totalInSession: deck.cards.filter(function (c) { return c.phase !== 'mastered'; }).length
    };

    switchView('study');
    document.getElementById('mode-flip-panel').style.display = 'flex';
    document.getElementById('session-done').classList.remove('show');
    isFlipped = false;

    renderStudyCard();
  }

  function getCardById(id) {
    const deck = getDeck(activeSession ? activeSession.deckId : activeDeckId);
    return getCard(deck, id);
  }

  function loadNextBatch() {
    if (!activeSession) return false;

    if (activeSession.practiceQueue.length > 0) return true;

    const batchTestIds = activeSession.batchIds.filter(function (id) {
      const card = getCardById(id);
      return card && card.phase === 'test';
    });
    if (batchTestIds.length > 0) return true;

    const nextIds = activeSession.pendingIds.slice(0, BATCH_SIZE);
    if (nextIds.length === 0) return false;
    activeSession.pendingIds = activeSession.pendingIds.slice(nextIds.length);
    activeSession.batchIds = nextIds.slice();

    nextIds.forEach(function (id) {
      const card = getCardById(id);
      if (card) { card.phase = 'practice'; card.correctCount = 0; }
    });

    activeSession.practiceQueue = nextIds.slice();
    save();
    return true;
  }

  function pickNextCard() {
    if (!activeSession) return null;

    while (activeSession.practiceQueue.length > 0) {
      const id = activeSession.practiceQueue[0];
      const card = getCardById(id);
      if (card && card.phase === 'practice') {
        activeSession.currentCardId = id;
        return card;
      }
      activeSession.practiceQueue.shift();
    }

    const batchTestIds = activeSession.batchIds.filter(function (id) {
      const card = getCardById(id);
      return card && card.phase === 'test';
    });

    if (batchTestIds.length > 0) {
      let nextId = null;
      for (let i = 0; i < activeSession.testQueue.length; i++) {
        const tid = activeSession.testQueue[i];
        if (batchTestIds.indexOf(tid) >= 0) { nextId = tid; break; }
      }
      if (!nextId) nextId = batchTestIds[0];
      activeSession.currentCardId = nextId;
      return getCardById(nextId);
    }

    if (loadNextBatch()) return pickNextCard();

    activeSession.currentCardId = null;
    return null;
  }

  function renderStudyCard() {
    if (!activeSession) return;

    const card = pickNextCard();
    isFlipped = false;

    updateProgressBar();

    if (!card) { showSessionDone(); return; }

    const inner = document.getElementById('fc-inner');
    inner.classList.remove('flipped');

    const frontLabel = document.querySelector('#fc-3d .fc-face-front .fc-face-label');
    const backLabel = document.querySelector('#fc-3d .fc-face-back .fc-face-label');
    if (frontLabel) {
      frontLabel.textContent = card.phase === 'practice' ? t('fc.phasePractice') : t('fc.phaseTest');
    }
    if (backLabel) backLabel.textContent = t('fc.back');

    document.getElementById('fc-front-text').textContent = card.front || '—';
    document.getElementById('fc-back-text').textContent = card.back || '—';

    const hint = document.querySelector('#fc-3d .fc-face-front .fc-face-hint');
    if (hint) hint.textContent = t('fc.flipHint');

    document.getElementById('rating-flip').classList.remove('show');

    const ratingEls = document.querySelectorAll('#rating-flip .rating-btn small');
    if (ratingEls.length === 3) {
      if (card.phase === 'practice') {
        ratingEls[0].textContent = t('fc.rateWrongHint');
        ratingEls[1].textContent = t('fc.rateGoodHint');
        ratingEls[2].textContent = t('fc.rateEasyHint');
      } else {
        ratingEls[0].textContent = t('fc.rateWrongHint');
        ratingEls[1].textContent = t('fc.rateGoodHint');
        ratingEls[2].textContent = t('fc.rateEasyHint');
      }
    }
  }

  function flipCard() {
    if (!activeSession) return;
    if (isFlipped) return;
    isFlipped = true;
    const inner = document.getElementById('fc-inner');
    inner.classList.add('flipped');
    setTimeout(function () {
      document.getElementById('rating-flip').classList.add('show');
    }, 500);
  }

  function rateCard(rating) {
    if (!activeSession) return;
    const card = getCardById(activeSession.currentCardId);
    if (!card) return;

    if (card.phase === 'practice') {
      if (rating === 'wrong') {
        activeSession.practiceQueue = activeSession.practiceQueue.filter(function (id) { return id !== card.id; });
        activeSession.practiceQueue.push(card.id);
      } else {
        card.phase = 'test';
        card.correctCount = 0;
        activeSession.practiceQueue = activeSession.practiceQueue.filter(function (id) { return id !== card.id; });
        if (activeSession.testQueue.indexOf(card.id) < 0) {
          activeSession.testQueue.push(card.id);
        }
      }
    } else if (card.phase === 'test') {
      if (rating === 'wrong') {
        // Reset to practice — remove from test queue
        card.phase = 'practice';
        card.correctCount = 0;
        activeSession.testQueue = activeSession.testQueue.filter(function (id) { return id !== card.id; });
        if (activeSession.practiceQueue.indexOf(card.id) < 0) {
          activeSession.practiceQueue.push(card.id);
        }
      } else {
        const increment = rating === 'easy' ? 2 : 1;
        card.correctCount = Math.min(MASTERY_THRESHOLD, card.correctCount + increment);
        if (card.correctCount >= MASTERY_THRESHOLD) {
          card.phase = 'mastered';
          activeSession.testQueue = activeSession.testQueue.filter(function (id) { return id !== card.id; });
          activeSession.doneInSession++;
        } else {
          // Rotate to the BACK of the test queue so other batch cards
          // come first next time. This is what stops the repeat.
          activeSession.testQueue = activeSession.testQueue.filter(function (id) { return id !== card.id; });
          activeSession.testQueue.push(card.id);
        }
      }
    }

    save();
    activeSession.currentCardId = null;
    renderStudyCard();
  }

  function showSessionDone() {
    document.getElementById('mode-flip-panel').style.display = 'none';
    document.getElementById('session-done').classList.add('show');
    document.getElementById('session-done-text').textContent = t('fc.sessionDoneText');
  }

  function exitStudy() {
    activeSession = null;
    switchView('deck');
    renderDeckDetail();
    renderDeckGrid();
  }

  /* ============================================================
     EXPORT
     ============================================================ */
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function csvEscape(v) {
    const s = String(v === null || v === undefined ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function exportCSV() {
    const deck = getDeck(activeDeckId);
    if (!deck) return;
    const lines = ['front,back,phase,correctCount'];
    deck.cards.forEach(function (c) {
      lines.push([csvEscape(c.front), csvEscape(c.back), c.phase, c.correctCount].join(','));
    });
    const safe = deck.name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'deck';
    downloadFile(safe + '.csv', lines.join('\n'), 'text/csv');
  }

  function exportJSON() {
    const deck = getDeck(activeDeckId);
    if (!deck) return;
    const safe = deck.name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase() || 'deck';
    downloadFile(safe + '.json', JSON.stringify(deck, null, 2), 'application/json');
  }

  /* ============================================================
     LANGUAGE
     ============================================================ */
  function applyLanguage(lang) {
    currentLanguage = translations[lang] ? lang : 'nl';
    document.documentElement.lang = currentLanguage;
    try { localStorage.setItem(LANG_KEY, currentLanguage); } catch (e) {}

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const key = el.dataset.i18n;
      const v = t(key);
      if (key === 'fc.pasteHint' || key === 'fc.legendExplainText') el.innerHTML = v;
      else el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });

    const sel = document.getElementById('language-select');
    if (sel) sel.value = currentLanguage;

    renderDeckGrid();
    if (activeDeckId) renderDeckDetail();
    if (activeSession) renderStudyCard();
  }

  /* ============================================================
     INIT
     ============================================================ */
  load();
  applyLanguage(currentLanguage);

  document.getElementById('language-select').addEventListener('change', function (e) {
    applyLanguage(e.target.value);
  });

  document.getElementById('btn-new-deck').addEventListener('click', function () {
    openDeckModal(null);
  });

  document.getElementById('modal-deck-close').addEventListener('click', closeDeckModal);
  document.getElementById('modal-deck-cancel').addEventListener('click', closeDeckModal);
  document.getElementById('modal-deck-save').addEventListener('click', saveDeckModal);
  document.getElementById('modal-deck').addEventListener('click', function (e) {
    if (e.target === this) closeDeckModal();
  });

  document.getElementById('modal-card-close').addEventListener('click', closeCardModal);
  document.getElementById('modal-card-cancel').addEventListener('click', closeCardModal);
  document.getElementById('modal-card-save').addEventListener('click', saveCardModal);
  document.getElementById('modal-card').addEventListener('click', function (e) {
    if (e.target === this) closeCardModal();
  });

  const ta = document.getElementById('paste-textarea');
  if (ta) ta.addEventListener('input', updatePasteCount);
  const pasteBtn = document.getElementById('btn-paste-add');
  if (pasteBtn) pasteBtn.addEventListener('click', addPastedCards);

  document.getElementById('btn-back-decks').addEventListener('click', function () {
    activeDeckId = null;
    switchView('decks');
    renderDeckGrid();
  });
  document.getElementById('btn-edit-deck').addEventListener('click', function () {
    if (activeDeckId) openDeckModal(activeDeckId);
  });
  document.getElementById('btn-delete-deck').addEventListener('click', function () {
    if (!activeDeckId) return;
    if (!window.confirm(t('fc.confirmDeleteDeck'))) return;
    state.decks = state.decks.filter(function (d) { return d.id !== activeDeckId; });
    activeDeckId = null;
    save();
    switchView('decks');
    renderDeckGrid();
  });
  document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
  document.getElementById('btn-export-json').addEventListener('click', exportJSON);
  document.getElementById('btn-add-card').addEventListener('click', function () { openCardModal(null); });

  document.getElementById('mode-flip').addEventListener('click', startStudy);

  const fc3d = document.getElementById('fc-3d');
  fc3d.addEventListener('click', flipCard);
  fc3d.addEventListener('keydown', function (e) {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
  });

  document.querySelectorAll('#rating-flip .rating-btn').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      rateCard(btn.dataset.rating);
    });
  });

  document.getElementById('btn-exit-study').addEventListener('click', exitStudy);
  document.getElementById('btn-done-exit').addEventListener('click', exitStudy);

  document.addEventListener('keydown', function (e) {
    if (!activeSession) return;
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea') return;
    if (e.key === ' ') { e.preventDefault(); flipCard(); }
  });

  window.studystackFlashcards = {
    getState: function () { return state; },
    save: save
  };
})();
