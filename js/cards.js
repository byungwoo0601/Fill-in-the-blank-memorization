function getCurrentSourceMeta() {
  return {
    sourceType: currentSourceMeta?.sourceType || "manual",
    sourcePage: Number(currentSourceMeta?.sourcePage) || 1,
  };
}

function getSourceLabel(meta) {
  const sourceType = meta?.sourceType || "manual";
  const sourcePage = Number(meta?.sourcePage) || 1;

  if (sourceType === "pdf") {
    return `PDF / ${sourcePage}페이지`;
  }

  if (sourceType === "image") {
    return `이미지 / ${sourcePage}페이지`;
  }

  return `수동 / ${sourcePage}페이지`;
}

function getCardSourceLabel(card) {
  return `원본: ${getSourceLabel({
    sourceType: card?.sourceType || "manual",
    sourcePage: Number(card?.sourcePage) || 1,
  })}`;
}

function updateCurrentSourceInfo() {
  if (!currentSourceInfo) return;

  currentSourceInfo.textContent = `현재 원본: ${getSourceLabel(
    getCurrentSourceMeta(),
  )}`;
}

function normalizeAnswer(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

function clearFieldState(field) {
  field.classList.remove("is-correct", "is-wrong", "is-empty", "is-revealed");

  const hint = field.querySelector(".answer-hint");
  if (hint) hint.textContent = "";
}

function makeClozeField(answer, options = {}) {
  const gradeable = options.gradeable !== false;
  const field = document.createElement("span");
  field.className = "cloze-field";
  field.dataset.answer = answer;
  field.style.setProperty(
    "--blank-width",
    `${Math.max(5, [...String(answer)].length + 2)}ch`,
  );

  const input = document.createElement("input");
  input.className = "blank-input";
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.inputMode = "text";
  input.setAttribute("aria-label", "빈칸 정답 입력");
  input.dataset.answer = answer;

  if (!gradeable) {
    input.disabled = true;
    input.placeholder = "";
  }

  input.addEventListener("input", () => clearFieldState(field));

  const hint = document.createElement("span");
  hint.className = "answer-hint";

  field.append(input, hint);
  return field;
}

function renderTemplate(target, template, options = {}) {
  target.textContent = "";

  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      target.appendChild(
        document.createTextNode(template.slice(lastIndex, match.index)),
      );
    }

    target.appendChild(makeClozeField(match[1], options));
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < template.length) {
    target.appendChild(document.createTextNode(template.slice(lastIndex)));
  }
}

function renderDemo() {
  renderTemplate(demoMainBox, demoMain, { gradeable: true });
  demoLinesRoot.textContent = "";

  demoLines.forEach((line) => {
    const div = document.createElement("div");
    div.className =
      `textbook-line ${line.type === "sub" ? "sub" : ""} ${line.type === "heading" ? "heading-line" : ""}`.trim();

    renderTemplate(div, line.text, { gradeable: true });
    demoLinesRoot.appendChild(div);
  });
}

function getSortedBlanks() {
  return [...editorBlanks].sort((a, b) => a.start - b.start || a.end - b.end);
}

function hasOverlap(start, end) {
  return editorBlanks.some((blank) => start < blank.end && end > blank.start);
}

function renderSentenceWithBlanks(target, sentence, blanks, options = {}) {
  target.textContent = "";

  const sorted = [...blanks].sort((a, b) => a.start - b.start);
  let cursor = 0;

  sorted.forEach((blank) => {
    if (blank.start > cursor) {
      target.appendChild(
        document.createTextNode(sentence.slice(cursor, blank.start)),
      );
    }

    target.appendChild(
      makeClozeField(sentence.slice(blank.start, blank.end), options),
    );
    cursor = blank.end;
  });

  if (cursor < sentence.length) {
    target.appendChild(document.createTextNode(sentence.slice(cursor)));
  }
}

function updateEditorPreview() {
  const sentence = sentenceInput.value;
  const sorted = getSortedBlanks();

  blankCount.textContent = `빈칸 ${sorted.length}개`;

  if (!sentence.trim()) {
    editorPreview.className = "cloze-preview empty";
    editorPreview.textContent = "아직 문장이 없습니다.";
    return;
  }

  editorPreview.className = "cloze-preview";
  renderSentenceWithBlanks(editorPreview, sentence, sorted, {
    gradeable: false,
  });
}

function setEditorMessage(message, isError = false) {
  editorMessage.textContent = message;
  editorMessage.style.color = isError ? "#c23737" : "var(--blue-dark)";
}

function addSelectedBlank() {
  const start = sentenceInput.selectionStart;
  const end = sentenceInput.selectionEnd;
  const selected = sentenceInput.value.slice(start, end);

  if (start === end || !selected.trim()) {
    setEditorMessage("빈칸으로 만들 문장을 먼저 드래그해서 선택하세요.", true);
    sentenceInput.focus();
    return;
  }

  if (hasOverlap(start, end)) {
    setEditorMessage(
      "이미 지정한 빈칸과 겹칩니다. 다른 영역을 선택하세요.",
      true,
    );
    return;
  }

  editorBlanks.push({ start, end });
  updateEditorPreview();
  setEditorMessage(`빈칸 추가: ${selected}`);
  sentenceInput.focus();
}

function clearEditor() {
  titleInput.value = "";
  sentenceInput.value = "";
  editorBlanks = [];
  editingCardId = null;

  const saveCardBtn = $("#saveCardBtn");
  if (saveCardBtn) {
    saveCardBtn.textContent = "문장 등록";
  }

  if (editBadge) {
    editBadge.classList.add("hidden");
  }

  updateEditorPreview();
  setEditorMessage("");
}

function createCardId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function saveCurrentCard() {
  const title = titleInput.value.trim() || "제목 없는 문장";
  const sentence = sentenceInput.value;
  const blanks = getSortedBlanks();

  if (!sentence.trim()) {
    setEditorMessage("원문 문장을 입력하세요.", true);
    return;
  }

  if (blanks.length === 0) {
    setEditorMessage("최소 1개 이상의 빈칸을 지정하세요.", true);
    return;
  }

  const previousCard = editingCardId
    ? userCards.find((card) => card.id === editingCardId)
    : null;

  const currentMeta = getCurrentSourceMeta();

  const sourceMeta = previousCard
    ? {
        sourceType: previousCard.sourceType || currentMeta.sourceType,
        sourcePage: previousCard.sourcePage || currentMeta.sourcePage,
      }
    : currentMeta;

  const cardData = {
    id: editingCardId || createCardId(),
    title,
    sentence,
    blanks,
    setId: previousCard?.setId || getSetIdForNewCard(),
    sourceType: sourceMeta.sourceType,
    sourcePage: Number(sourceMeta.sourcePage) || 1,
    stats: previousCard?.stats || null,
    createdAt: editingCardId
      ? previousCard?.createdAt || new Date().toISOString()
      : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (editingCardId) {
    const index = userCards.findIndex((card) => card.id === editingCardId);

    if (index >= 0) {
      userCards[index] = cardData;
    } else {
      userCards.unshift(cardData);
    }

    saveCards();
    renderUserCards();
    clearEditor();
    setEditorMessage("문장을 수정했습니다.");
    return;
  }

  userCards.unshift(cardData);
  saveCards();
  renderUserCards();
  updateSetStatus();
  clearEditor();
  setEditorMessage("문장을 등록했습니다.");
}

function editCard(cardId) {
  const card = userCards.find((item) => item.id === cardId);

  if (!card) {
    setEditorMessage("수정할 문장을 찾지 못했습니다.", true);
    return;
  }

  editingCardId = card.id;
  titleInput.value = card.title || "";
  sentenceInput.value = card.sentence || "";
  editorBlanks = (card.blanks || []).map((blank) => ({
    start: Number(blank.start),
    end: Number(blank.end),
  }));

  const saveCardBtn = $("#saveCardBtn");
  if (saveCardBtn) {
    saveCardBtn.textContent = "수정 저장";
  }

  if (editBadge) {
    editBadge.classList.remove("hidden");
  }

  updateEditorPreview();
  setEditorMessage(
    "수정 모드입니다. 문장을 직접 수정하면 기존 빈칸 선택은 초기화됩니다.",
  );

  const creator = document.querySelector(".creator");
  if (creator) {
    creator.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function hasWrongHistory(card) {
  return Number(card?.stats?.lastWrong) > 0;
}

function getCardStatsLabel(card) {
  const stats = card?.stats;

  if (!stats || !stats.lastGradedAt) {
    return "채점 기록 없음";
  }

  const date = new Date(stats.lastGradedAt);
  const dateText = Number.isNaN(date.getTime())
    ? "최근 채점"
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  return `${dateText} · 정답 ${stats.lastCorrect || 0} · 오답 ${stats.lastWrong || 0} · 미입력 ${stats.lastEmpty || 0} · 누적 채점 ${stats.attempts || 1}회`;
}

function normalizeCardStats(stats) {
  if (!stats || typeof stats !== "object") return null;

  return {
    attempts: Number(stats.attempts) || 0,
    lastTotal: Number(stats.lastTotal) || 0,
    lastCorrect: Number(stats.lastCorrect) || 0,
    lastWrong: Number(stats.lastWrong) || 0,
    lastEmpty: Number(stats.lastEmpty) || 0,
    lastGradedAt: stats.lastGradedAt || "",
  };
}

function getFilterModeLabel(mode) {
  switch (mode) {
    case "current":
      return "현재 페이지";
    case "wrong":
      return "오답 문장";
    case "random":
      return "랜덤";
    case "all":
    default:
      return "전체";
  }
}

function getCardsByFilterMode(mode) {
  let cards = userCards;

  if (mode === "wrong") {
    cards = cards.filter((card) => hasWrongHistory(card));
  } else if (mode === "current") {
    const currentMeta = getCurrentSourceMeta();

    cards = cards.filter((card) => {
      const cardSourceType = card.sourceType || "manual";
      const cardSourcePage = Number(card.sourcePage) || 1;

      return (
        cardSourceType === currentMeta.sourceType &&
        cardSourcePage === Number(currentMeta.sourcePage)
      );
    });
  }

  return applySetFilter(cards);
}

function getVisibleCards() {
  if (cardFilterMode === "random") {
    return userCards.filter((card) => card.id === currentRandomCardId);
  }

  return applySearchFilter(getCardsByFilterMode(cardFilterMode));
}

function setCardFilterMode(mode) {
  cardFilterMode = mode;

  if (cardFilterMode !== "random") {
    currentRandomCardId = null;
    randomBaseFilterMode = cardFilterMode;
  }

  if (filterAllCardsBtn) {
    filterAllCardsBtn.classList.toggle("active", cardFilterMode === "all");
  }

  if (filterCurrentPageCardsBtn) {
    filterCurrentPageCardsBtn.classList.toggle(
      "active",
      cardFilterMode === "current",
    );
  }

  if (filterWrongCardsBtn) {
    filterWrongCardsBtn.classList.toggle("active", cardFilterMode === "wrong");
  }

  if (pickRandomCardBtn) {
    pickRandomCardBtn.classList.toggle("active", cardFilterMode === "random");
    pickRandomCardBtn.textContent =
      cardFilterMode === "random" ? "다음 랜덤" : "랜덤 복습";
  }

  if (clearRandomCardBtn) {
    clearRandomCardBtn.classList.toggle("hidden", cardFilterMode !== "random");
  }

  updateRandomStatus();
  renderUserCards();
  updateSummary();
}

function renderUserCards() {
  contentRoot.textContent = "";

  const visibleCards = getVisibleCards();

  if (visibleCards.length === 0) {
    const empty = document.createElement("div");
    empty.className = "user-card";

    if (cardSearchQuery.trim()) {
      empty.textContent = `"${cardSearchQuery.trim()}" 검색 결과가 없습니다.`;
    } else if (cardFilterMode === "current") {
      empty.textContent = `현재 원본(${getSourceLabel(getCurrentSourceMeta())})에 연결된 문장이 없습니다.`;
    } else if (cardFilterMode === "wrong") {
      empty.textContent = "최근 오답이 있는 문장이 없습니다.";
    } else if (cardFilterMode === "random") {
      empty.textContent = "랜덤으로 선택된 문장이 없습니다.";
    } else {
      empty.textContent = "표시할 문장이 없습니다.";
    }

    contentRoot.appendChild(empty);
    updateSummary();
    updateSearchStatus();
    return;
  }

  visibleCards.forEach((card) => {
    const article = document.createElement("article");
    article.className = "user-card";
    article.dataset.cardId = card.id;

    if (hasWrongHistory(card)) {
      article.classList.add("has-wrong");
    }

    const h3 = document.createElement("h3");
    appendHighlightedText(h3, card.title, cardSearchQuery);

    const set = document.createElement("p");
    set.className = "card-set";
    set.textContent = `세트: ${getCardSetLabel(card)}`;

    const source = document.createElement("p");
    source.className = "card-source";
    source.textContent = getCardSourceLabel(card);

    const stats = document.createElement("p");
    stats.className = "card-stats";
    stats.textContent = getCardStatsLabel(card);

    if (hasWrongHistory(card)) {
      stats.classList.add("has-wrong");
    }

    const sentence = document.createElement("div");
    sentence.className = "user-sentence";
    renderSentenceWithBlanks(sentence, card.sentence, card.blanks, {
      gradeable: true,
    });

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.textContent = "수정";
    editBtn.addEventListener("click", () => {
      editCard(card.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "danger";
    deleteBtn.textContent = "삭제";
    deleteBtn.addEventListener("click", () => {
      if (!confirm(`"${card.title || "제목 없는 문장"}" 문장을 삭제할까요?`)) {
        return;
      }

      userCards = userCards.filter((item) => item.id !== card.id);
      saveCards();

      if (editingCardId === card.id) {
        clearEditor();
      }

      renderUserCards();
      updateSetStatus();
      updateSearchStatus();
      updateSummary();
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    article.append(h3, set, source, stats, sentence, actions);
    contentRoot.appendChild(article);
  });

  updateSummary();
  updateSearchStatus();
  updateSetStatus();
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

function getCardSearchText(card) {
  const blankAnswers = Array.isArray(card.blanks)
    ? card.blanks
        .map((blank) =>
          card.sentence.slice(Number(blank.start), Number(blank.end)),
        )
        .join(" ")
    : "";

  return [
    card.title || "",
    card.sentence || "",
    blankAnswers,
    getCardSetLabel(card),
    getCardSourceLabel(card),
    card.sourceType || "",
    card.sourcePage || "",
  ].join(" ");
}

function cardMatchesSearch(card, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) return true;

  const normalizedTarget = normalizeSearchText(getCardSearchText(card));
  return normalizedTarget.includes(normalizedQuery);
}

function applySearchFilter(cards) {
  if (!cardSearchQuery.trim()) return cards;

  return cards.filter((card) => cardMatchesSearch(card, cardSearchQuery));
}

function getSearchResultCount() {
  return applySearchFilter(
    getCardsByFilterMode(
      cardFilterMode === "random" ? randomBaseFilterMode : cardFilterMode,
    ),
  ).length;
}

function updateSearchStatus() {
  if (!searchStatus) return;

  const query = cardSearchQuery.trim();

  if (!query) {
    searchStatus.textContent = "검색어 없음";
    return;
  }

  searchStatus.textContent = `검색어: "${query}" · 결과 ${getSearchResultCount()}개`;
}

function setCardSearchQuery(query) {
  cardSearchQuery = String(query || "");

  try {
    localStorage.setItem(SEARCH_KEY, cardSearchQuery);
  } catch (error) {
    console.warn(error);
  }

  if (cardSearchInput && cardSearchInput.value !== cardSearchQuery) {
    cardSearchInput.value = cardSearchQuery;
  }

  if (cardFilterMode === "random") {
    currentRandomCardId = null;
    setCardFilterMode(randomBaseFilterMode || "all");
    return;
  }

  updateSearchStatus();
  renderUserCards();
  updateSummary();
}

function clearCardSearch() {
  setCardSearchQuery("");
}

function appendHighlightedText(target, text, query) {
  const rawText = String(text || "");
  const rawQuery = String(query || "").trim();

  if (!rawQuery) {
    target.appendChild(document.createTextNode(rawText));
    return;
  }

  const lowerText = rawText.toLowerCase();
  const lowerQuery = rawQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index < 0) {
    target.appendChild(document.createTextNode(rawText));
    return;
  }

  target.appendChild(document.createTextNode(rawText.slice(0, index)));

  const mark = document.createElement("mark");
  mark.className = "search-hit";
  mark.textContent = rawText.slice(index, index + rawQuery.length);
  target.appendChild(mark);

  target.appendChild(
    document.createTextNode(rawText.slice(index + rawQuery.length)),
  );
}

function exportStudyData() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    sets: studySets,
    cards: userCards,
  };

  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `cloze-study-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
  setPhotoMessage("학습 데이터를 JSON 파일로 내보냈습니다.");
}

function importStudyDataFromFile(file) {
  const reader = new FileReader();

  reader.onerror = () => {
    setPhotoMessage("JSON 파일을 읽지 못했습니다.", true);
  };

  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const importedCards = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.cards)
          ? parsed.cards
          : null;

      if (!importedCards) {
        setPhotoMessage("불러올 수 있는 cards 데이터가 없습니다.", true);
        return;
      }

      const importedSets = Array.isArray(parsed?.sets) ? parsed.sets : [];
      const normalizedImportedSets = normalizeStudySets(importedSets);
      const importedSetIds = new Set(
        normalizedImportedSets.map((set) => set.id),
      );

      const normalizedCards = importedCards
        .filter((card) => card && typeof card.sentence === "string")
        .map((card) => ({
          id: card.id || createCardId(),
          title: card.title || "제목 없는 문장",
          sentence: card.sentence,
          blanks: Array.isArray(card.blanks)
            ? card.blanks
                .map((blank) => ({
                  start: Number(blank.start),
                  end: Number(blank.end),
                }))
                .filter(
                  (blank) =>
                    Number.isInteger(blank.start) &&
                    Number.isInteger(blank.end) &&
                    blank.start >= 0 &&
                    blank.end > blank.start &&
                    blank.end <= card.sentence.length,
                )
            : [],
          setId: importedSetIds.has(card.setId) ? card.setId : DEFAULT_SET_ID,
          sourceType: card.sourceType || "manual",
          sourcePage: Number(card.sourcePage) || 1,
          stats: normalizeCardStats(card.stats),
          createdAt: card.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
        .filter((card) => card.blanks.length > 0);

      if (normalizedCards.length === 0) {
        setPhotoMessage("유효한 학습 문장이 없습니다.", true);
        return;
      }

      const shouldReplace = confirm(
        "불러온 데이터로 기존 문장을 교체할까요?\n\n확인: 기존 문장 교체\n취소: 기존 문장 뒤에 추가",
      );

      if (shouldReplace) {
        studySets = normalizedImportedSets;
        userCards = normalizedCards;
        activeSetId = ALL_SETS_ID;
      } else {
        const mergedSetMap = new Map();

        studySets.forEach((set) => mergedSetMap.set(set.id, set));
        normalizedImportedSets.forEach((set) => mergedSetMap.set(set.id, set));

        studySets = normalizeStudySets([...mergedSetMap.values()]);
        userCards = [...normalizedCards, ...userCards];
      }

      editingCardId = null;
      saveStudySets();
      saveActiveSetId();
      saveCards();
      clearEditor();
      renderSetOptions();
      renderUserCards();
      clearAnswers();

      setPhotoMessage(
        `JSON 데이터를 불러왔습니다. 문장 ${normalizedCards.length}개가 적용되었습니다.`,
      );
    } catch (error) {
      console.warn(error);
      setPhotoMessage("JSON 형식이 올바르지 않습니다.", true);
    }
  };

  reader.readAsText(file, "utf-8");
}
