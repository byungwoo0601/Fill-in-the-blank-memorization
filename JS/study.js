function isVisibleElement(element) {
  return !!(
    element &&
    element.getClientRects &&
    element.getClientRects().length > 0
  );
}

function getGradeableFields() {
  return [...document.querySelectorAll(".cloze-field")].filter((field) => {
    const input = field.querySelector(".blank-input");
    return input && !input.disabled && isVisibleElement(field);
  });
}

function setAppMode(mode) {
  currentMode = mode === "study" ? "study" : "create";

  document.body.classList.toggle("study-mode", currentMode === "study");
  document.body.classList.toggle("create-mode", currentMode === "create");

  if (createModeBtn) {
    createModeBtn.classList.toggle("active", currentMode === "create");
  }

  if (studyModeBtn) {
    studyModeBtn.classList.toggle("active", currentMode === "study");
  }

  if (modeDescription) {
    modeDescription.textContent =
      currentMode === "study"
        ? "현재 학습 모드입니다. 원본과 제작 도구를 숨기고 빈칸 문제만 풉니다."
        : "현재 제작 모드입니다. 원본 업로드, OCR, 문장 생성, 빈칸 지정이 가능합니다.";
  }

  localStorage.setItem(MODE_KEY, currentMode);

  if (currentMode === "study") {
    clearAnswers();
  }

  renderUserCards();
  updateSummary();
}

function updateSummary(result = null) {
  const fields = getGradeableFields();

  if (!result) {
    summary.textContent = `전체 빈칸 ${fields.length}개 · 채점 전`;
    return;
  }

  summary.textContent = `전체 빈칸 ${fields.length}개 · 정답 ${result.correct}개 · 오답 ${result.wrong}개 · 미입력 ${result.empty}개`;
}

function saveGradeStats(cardResults) {
  if (!cardResults || cardResults.size === 0) return;

  const gradedAt = new Date().toISOString();

  userCards = userCards.map((card) => {
    const result = cardResults.get(card.id);

    if (!result) return card;

    const previousStats = card.stats || {};

    return {
      ...card,
      stats: {
        attempts: (Number(previousStats.attempts) || 0) + 1,
        lastTotal: result.correct + result.wrong + result.empty,
        lastCorrect: result.correct,
        lastWrong: result.wrong,
        lastEmpty: result.empty,
        lastGradedAt: gradedAt,
      },
      updatedAt: new Date().toISOString(),
    };
  });

  saveCards();
}

function gradeAnswers() {
  const fields = getGradeableFields();
  const result = { correct: 0, wrong: 0, empty: 0 };
  const cardResults = new Map();

  fields.forEach((field) => {
    const input = field.querySelector(".blank-input");
    const hint = field.querySelector(".answer-hint");
    const answer = field.dataset.answer || input.dataset.answer || "";
    const typed = input.value;

    clearFieldState(field);

    let state = "empty";

    if (!typed.trim()) {
      field.classList.add("is-empty");
      result.empty += 1;
      state = "empty";
    } else if (normalizeAnswer(typed) === normalizeAnswer(answer)) {
      field.classList.add("is-correct");
      result.correct += 1;
      state = "correct";
    } else {
      field.classList.add("is-wrong");
      hint.textContent = `정답: ${answer}`;
      result.wrong += 1;
      state = "wrong";
    }

    const cardElement = field.closest(".user-card[data-card-id]");

    if (cardElement) {
      const cardId = cardElement.dataset.cardId;

      if (!cardResults.has(cardId)) {
        cardResults.set(cardId, {
          correct: 0,
          wrong: 0,
          empty: 0,
        });
      }

      const cardResult = cardResults.get(cardId);
      cardResult[state] += 1;
    }
  });

  saveGradeStats(cardResults);
  updateSessionStatsFromGrade(cardResults);
  refreshRenderedCardStats();
  updateSummary(result);

  if (cardFilterMode === "wrong") {
    renderUserCards();
  }
}

function refreshRenderedCardStats() {
  document.querySelectorAll(".user-card[data-card-id]").forEach((article) => {
    const cardId = article.dataset.cardId;
    const card = userCards.find((item) => item.id === cardId);

    if (!card) return;

    const stats = article.querySelector(".card-stats");

    if (stats) {
      stats.textContent = getCardStatsLabel(card);
      stats.classList.toggle("has-wrong", hasWrongHistory(card));
    }

    article.classList.toggle("has-wrong", hasWrongHistory(card));
  });
}

function clearAnswers() {
  getGradeableFields().forEach((field) => {
    const input = field.querySelector(".blank-input");
    input.value = "";
    clearFieldState(field);
  });

  updateSummary();
}

function showAnswers() {
  getGradeableFields().forEach((field) => {
    const input = field.querySelector(".blank-input");
    const hint = field.querySelector(".answer-hint");
    const answer = field.dataset.answer || input.dataset.answer || "";

    input.value = answer;
    clearFieldState(field);
    field.classList.add("is-revealed");
    hint.textContent = `정답: ${answer}`;
  });

  updateSummary({
    correct: getGradeableFields().length,
    wrong: 0,
    empty: 0,
  });
}

function renderSessionStats() {
  if (!sessionStatsText) return;

  sessionStats = normalizeSessionStats(sessionStats);

  const solvedCount = sessionStats.gradedCardIds.length;
  const total = sessionStats.correct + sessionStats.wrong + sessionStats.empty;
  const accuracy =
    total > 0 ? Math.round((sessionStats.correct / total) * 100) : 0;

  if (total === 0) {
    sessionStatsText.textContent = "오늘 학습 기록 없음";
    return;
  }

  sessionStatsText.textContent =
    `오늘 푼 문장 ${solvedCount}개 · ` +
    `채점 ${sessionStats.gradeAttempts}회 · ` +
    `정답 ${sessionStats.correct} · ` +
    `오답 ${sessionStats.wrong} · ` +
    `미입력 ${sessionStats.empty} · ` +
    `정답률 ${accuracy}%`;
}

function updateSessionStatsFromGrade(cardResults) {
  if (!cardResults || cardResults.size === 0) {
    renderSessionStats();
    return;
  }

  sessionStats = normalizeSessionStats(sessionStats);

  const gradedIds = new Set(sessionStats.gradedCardIds);
  let correct = 0;
  let wrong = 0;
  let empty = 0;

  cardResults.forEach((result, cardId) => {
    gradedIds.add(cardId);
    correct += Number(result.correct) || 0;
    wrong += Number(result.wrong) || 0;
    empty += Number(result.empty) || 0;
  });

  sessionStats = {
    ...sessionStats,
    gradedCardIds: [...gradedIds],
    gradeAttempts: sessionStats.gradeAttempts + cardResults.size,
    correct: sessionStats.correct + correct,
    wrong: sessionStats.wrong + wrong,
    empty: sessionStats.empty + empty,
    lastGradedAt: new Date().toISOString(),
  };

  saveSessionStats();
  renderSessionStats();
}

function resetSessionStats() {
  if (
    !confirm(
      "오늘 학습 진행률을 초기화할까요? 문장 데이터와 오답 기록은 유지됩니다.",
    )
  )
    return;

  sessionStats = createEmptySessionStats();
  saveSessionStats();
  renderSessionStats();
}

function updateRandomStatus() {
  if (!randomStatus) return;

  if (cardFilterMode !== "random" || !currentRandomCardId) {
    randomStatus.textContent = "랜덤 대기";
    return;
  }

  const card = userCards.find((item) => item.id === currentRandomCardId);
  const baseLabel = getFilterModeLabel(randomBaseFilterMode);

  randomStatus.textContent = card
    ? `랜덤 복습 중 · 기준: ${baseLabel} · ${card.title || "제목 없는 문장"}`
    : `랜덤 복습 중 · 기준: ${baseLabel}`;
}

function pickRandomCard() {
  const baseMode =
    cardFilterMode === "random" ? randomBaseFilterMode : cardFilterMode;

  const candidates = applySearchFilter(getCardsByFilterMode(baseMode)).filter(
    (card) => card && card.id,
  );

  if (candidates.length === 0) {
    currentRandomCardId = null;

    const label = getFilterModeLabel(baseMode);
    updateRandomStatus();

    if (summary) {
      summary.textContent = `${label} 기준으로 랜덤 복습할 문장이 없습니다.`;
    }

    return;
  }

  let pool = candidates;

  if (currentRandomCardId && candidates.length > 1) {
    pool = candidates.filter((card) => card.id !== currentRandomCardId);
  }

  const selected = pool[Math.floor(Math.random() * pool.length)];

  currentRandomCardId = selected.id;
  randomBaseFilterMode = baseMode;

  setCardFilterMode("random");
  clearAnswers();
  updateRandomStatus();
}

function clearRandomCard() {
  currentRandomCardId = null;
  setCardFilterMode(randomBaseFilterMode || "all");
}
