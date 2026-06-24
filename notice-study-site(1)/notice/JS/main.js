// js/main.js

const appReady = validateAppHealth();

console.log("[App Ready]", appReady);

if (!appReady) {
  console.warn(
    "[App] 앱 상태 점검 실패. HTML id 누락 또는 라이브러리 로드 문제를 확인하세요.",
  );
}

if (appReady) {
  bindEvents();
  initializeApp();
}

function bindEvents() {
  $("#addBlankBtn").addEventListener("click", addSelectedBlank);

  $("#undoBlankBtn").addEventListener("click", () => {
    const removed = editorBlanks.pop();
    updateEditorPreview();
    setEditorMessage(
      removed ? "마지막 빈칸을 취소했습니다." : "취소할 빈칸이 없습니다.",
      !removed,
    );
  });

  $("#clearEditorBtn").addEventListener("click", clearEditor);
  $("#saveCardBtn").addEventListener("click", saveCurrentCard);

  $("#gradeBtn").addEventListener("click", gradeAnswers);
  $("#clearAnswersBtn").addEventListener("click", clearAnswers);
  $("#showAllBtn").addEventListener("click", showAnswers);

  photoInput.addEventListener("change", handlePhotoUpload);
  removePhotoBtn.addEventListener("click", removeStoredPhoto);
  ocrBtn.addEventListener("click", runOcrFromPhoto);
  extractPdfTextBtn.addEventListener("click", extractTextFromCurrentPdfPage);

  copyOcrToSentenceBtn.addEventListener("click", copyOcrTextToSentence);
  clearOcrBtn.addEventListener("click", clearOcrText);
  ocrText.addEventListener("input", saveOcrText);

  prevPdfPageBtn.addEventListener("click", () => goToPdfPage(-1));
  nextPdfPageBtn.addEventListener("click", () => goToPdfPage(1));

  toggleSelectAreaBtn.addEventListener("click", () => {
    if (!hasVisibleSourceImage()) {
      setSelectionStatus("먼저 이미지 또는 PDF를 업로드하세요.", true);
      return;
    }

    setAreaSelectMode(!areaSelectMode);
  });

  ocrSelectedAreaBtn.addEventListener("click", runOcrFromSelectedArea);
  clearSelectionBtn.addEventListener("click", clearSelectedArea);

  selectionLayer.addEventListener("pointerdown", startAreaSelection);
  selectionLayer.addEventListener("pointermove", moveAreaSelection);
  selectionLayer.addEventListener("pointerup", endAreaSelection);
  selectionLayer.addEventListener("pointercancel", () => {
    isSelectingArea = false;
  });

  filterAllCardsBtn.addEventListener("click", () => {
    setCardFilterMode("all");
  });

  filterCurrentPageCardsBtn.addEventListener("click", () => {
    setCardFilterMode("current");
  });

  filterWrongCardsBtn.addEventListener("click", () => {
    setCardFilterMode("wrong");
  });

  pickRandomCardBtn.addEventListener("click", pickRandomCard);
  clearRandomCardBtn.addEventListener("click", clearRandomCard);

  cardSearchInput.addEventListener("input", (event) => {
    setCardSearchQuery(event.target.value);
  });

  clearSearchBtn.addEventListener("click", () => {
    clearCardSearch();
    cardSearchInput.focus();
  });

  setFilterSelect.addEventListener("change", (event) => {
    setActiveSet(event.target.value);
  });

  addSetBtn.addEventListener("click", addStudySet);

  newSetTitleInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addStudySet();
    }
  });

  renameSetBtn.addEventListener("click", renameActiveSet);
  deleteSetBtn.addEventListener("click", deleteActiveSet);

  createModeBtn.addEventListener("click", () => {
    setAppMode("create");
  });

  studyModeBtn.addEventListener("click", () => {
    setAppMode("study");
  });

  resetSessionBtn.addEventListener("click", resetSessionStats);

  exportDataBtn.addEventListener("click", exportStudyData);

  importDataBtn.addEventListener("click", () => {
    importDataInput.click();
  });

  importDataInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];

    if (!file) return;

    importStudyDataFromFile(file);
    importDataInput.value = "";
  });

  $("#resetDemoBtn").addEventListener("click", resetAllData);

  sentenceInput.addEventListener("input", () => {
    editorBlanks = [];
    updateEditorPreview();
    setEditorMessage("문장이 바뀌어서 기존 빈칸 선택을 초기화했습니다.");
  });

  memoInput.addEventListener("input", () => {
    localStorage.setItem(MEMO_KEY, memoInput.value);
  });
}

function initializeApp() {
  ensureExistingCardsHaveSet();
  renderSetOptions();

  if (cardSearchInput) {
    cardSearchInput.value = cardSearchQuery;
  }

  memoInput.value = localStorage.getItem(MEMO_KEY) || "";

  loadStoredPhoto();
  loadStoredOcrText();
  renderDemo();
  updateEditorPreview();
  updateCurrentSourceInfo();
  setCardFilterMode("all");
  renderUserCards();
  setAppMode(currentMode);
  updateRandomStatus();
  renderSessionStats();
  updateSearchStatus();
  updateSetStatus();
  updateSummary();
}

function resetAllData() {
  if (
    !confirm(
      "내가 만든 문장과 메모를 초기화할까요? 교재형 데모 문장은 유지됩니다.",
    )
  ) {
    return;
  }

  userCards = [];
  currentPdfDocument = null;
  currentPdfPage = 1;
  currentPdfTotalPages = 0;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(MEMO_KEY);
  localStorage.removeItem(OCR_TEXT_KEY);
  localStorage.removeItem(PHOTO_KEY);
  localStorage.removeItem(SOURCE_META_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SETS_KEY);
  localStorage.removeItem(ACTIVE_SET_KEY);
  localStorage.removeItem(SEARCH_KEY);

  studySets = normalizeStudySets([]);
  activeSetId = ALL_SETS_ID;
  sessionStats = createEmptySessionStats();

  cardSearchQuery = "";

  if (cardSearchInput) {
    cardSearchInput.value = "";
  }

  saveStudySets();
  saveActiveSetId();
  saveSessionStats();

  saveSourceMeta({
    sourceType: "manual",
    sourcePage: 1,
  });

  clearSelectedArea();
  setAreaSelectMode(false);
  setPhotoPreview(null);

  memoInput.value = "";
  ocrText.value = "";

  clearEditor();

  setOcrStatus("대기 중");
  updatePdfControls();
  renderSetOptions();
  renderSessionStats();
  renderUserCards();
  clearAnswers();
  updateCurrentSourceInfo();
  updateSetStatus();
}
