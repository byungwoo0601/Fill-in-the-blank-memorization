function createSetId() {
  return `set-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getStudySetById(setId) {
  return (
    studySets.find((set) => set.id === setId) ||
    studySets.find((set) => set.id === DEFAULT_SET_ID)
  );
}

function getSetTitle(setId) {
  return getStudySetById(setId)?.title || "기본 세트";
}

function getCardSetId(card) {
  const setId = card?.setId || DEFAULT_SET_ID;
  const exists = studySets.some((set) => set.id === setId);

  return exists ? setId : DEFAULT_SET_ID;
}

function getCardSetLabel(card) {
  return getSetTitle(getCardSetId(card));
}

function getSetIdForNewCard() {
  if (activeSetId && activeSetId !== ALL_SETS_ID) {
    return activeSetId;
  }

  return DEFAULT_SET_ID;
}

function applySetFilter(cards) {
  if (!activeSetId || activeSetId === ALL_SETS_ID) {
    return cards;
  }

  return cards.filter((card) => getCardSetId(card) === activeSetId);
}

function updateSetStatus() {
  if (!setStatus) return;

  if (activeSetId === ALL_SETS_ID) {
    setStatus.textContent = `전체 세트 보기 · 세트 ${studySets.length}개 · 문장 ${userCards.length}개`;
    return;
  }

  const setTitle = getSetTitle(activeSetId);
  const count = userCards.filter(
    (card) => getCardSetId(card) === activeSetId,
  ).length;

  setStatus.textContent = `현재 세트: ${setTitle} · 문장 ${count}개`;
}

function renderSetOptions() {
  if (!setFilterSelect) return;

  setFilterSelect.textContent = "";

  const allOption = document.createElement("option");
  allOption.value = ALL_SETS_ID;
  allOption.textContent = "전체 세트";
  setFilterSelect.appendChild(allOption);

  studySets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.id;
    option.textContent = set.title;
    setFilterSelect.appendChild(option);
  });

  const hasActiveSet =
    activeSetId === ALL_SETS_ID ||
    studySets.some((set) => set.id === activeSetId);

  if (!hasActiveSet) {
    activeSetId = ALL_SETS_ID;
    saveActiveSetId();
  }

  setFilterSelect.value = activeSetId;
  updateSetStatus();
}

function setActiveSet(setId) {
  activeSetId = setId || ALL_SETS_ID;
  saveActiveSetId();

  const nextFilterMode =
    cardFilterMode === "random"
      ? randomBaseFilterMode || "all"
      : cardFilterMode;

  currentRandomCardId = null;

  renderSetOptions();
  setCardFilterMode(nextFilterMode);
  updateSearchStatus();
  updateSetStatus();
}

function addStudySet() {
  const title = newSetTitleInput.value.trim();

  if (!title) {
    if (setStatus) setStatus.textContent = "추가할 세트 이름을 입력하세요.";
    newSetTitleInput.focus();
    return;
  }

  const duplicated = studySets.some((set) => set.title === title);

  if (duplicated) {
    if (setStatus) setStatus.textContent = "이미 같은 이름의 세트가 있습니다.";
    newSetTitleInput.focus();
    return;
  }

  const newSet = {
    id: createSetId(),
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  studySets.push(newSet);
  saveStudySets();

  newSetTitleInput.value = "";
  setActiveSet(newSet.id);
}

function renameActiveSet() {
  if (!activeSetId || activeSetId === ALL_SETS_ID) {
    if (setStatus)
      setStatus.textContent = "이름을 바꿀 세트를 먼저 선택하세요.";
    return;
  }

  if (activeSetId === DEFAULT_SET_ID) {
    if (setStatus)
      setStatus.textContent = "기본 세트 이름은 변경하지 않는 것을 권장합니다.";
    return;
  }

  const currentSet = getStudySetById(activeSetId);
  const nextTitle = prompt(
    "새 세트 이름을 입력하세요.",
    currentSet?.title || "",
  );

  if (nextTitle === null) return;

  const title = nextTitle.trim();

  if (!title) {
    if (setStatus) setStatus.textContent = "세트 이름은 비워둘 수 없습니다.";
    return;
  }

  const duplicated = studySets.some(
    (set) => set.id !== activeSetId && set.title === title,
  );

  if (duplicated) {
    if (setStatus) setStatus.textContent = "이미 같은 이름의 세트가 있습니다.";
    return;
  }

  studySets = studySets.map((set) =>
    set.id === activeSetId
      ? { ...set, title, updatedAt: new Date().toISOString() }
      : set,
  );

  saveStudySets();
  renderSetOptions();
  renderUserCards();
  updateSearchStatus();
}

function deleteActiveSet() {
  if (!activeSetId || activeSetId === ALL_SETS_ID) {
    if (setStatus) setStatus.textContent = "삭제할 세트를 먼저 선택하세요.";
    return;
  }

  if (activeSetId === DEFAULT_SET_ID) {
    if (setStatus) setStatus.textContent = "기본 세트는 삭제할 수 없습니다.";
    return;
  }

  const targetSet = getStudySetById(activeSetId);
  const title = targetSet?.title || "선택 세트";

  const ok = confirm(
    `"${title}" 세트를 삭제할까요?\n\n이 세트의 문장들은 삭제되지 않고 기본 세트로 이동합니다.`,
  );

  if (!ok) return;

  const deletingSetId = activeSetId;

  studySets = studySets.filter((set) => set.id !== deletingSetId);
  userCards = userCards.map((card) =>
    getCardSetId(card) === deletingSetId
      ? { ...card, setId: DEFAULT_SET_ID, updatedAt: new Date().toISOString() }
      : card,
  );

  saveStudySets();
  saveCards();

  setActiveSet(DEFAULT_SET_ID);
}

function ensureExistingCardsHaveSet() {
  let changed = false;
  const validSetIds = new Set(studySets.map((set) => set.id));

  userCards = userCards.map((card) => {
    if (card.setId && validSetIds.has(card.setId)) {
      return card;
    }

    changed = true;

    return {
      ...card,
      setId: DEFAULT_SET_ID,
      updatedAt: card.updatedAt || new Date().toISOString(),
    };
  });

  if (changed) {
    saveCards();
  }
}
