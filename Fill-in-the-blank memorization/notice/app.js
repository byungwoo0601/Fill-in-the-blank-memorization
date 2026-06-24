function setAppHealth(type, title, message) {
  if (!appHealthPanel || !appHealthTitle || !appHealthMessage) return;

  appHealthPanel.classList.remove("ok", "warn", "error");
  appHealthPanel.classList.add(type);

  appHealthTitle.textContent = title;
  appHealthMessage.textContent = message;
}

function getCurrentSourceMeta() {
  if (currentPdfDocument) {
    return {
      sourceType: "pdf",
      sourcePage: currentPdfPage || 1,
    };
  }

  if (hasVisibleSourceImage()) {
    return {
      sourceType: currentSourceMeta.sourceType || "image",
      sourcePage: Number(currentSourceMeta.sourcePage) || 1,
    };
  }

  return {
    sourceType: "manual",
    sourcePage: 1,
  };
}

function getSourceTypeLabel(sourceType) {
  switch (sourceType) {
    case "pdf":
      return "PDF";
    case "image":
      return "이미지";
    case "manual":
      return "수동";
    default:
      return "수동";
  }
}

function getSourceLabel(meta) {
  const sourceType = meta?.sourceType || "manual";
  const sourcePage = Number(meta?.sourcePage) || 1;
  return `${getSourceTypeLabel(sourceType)} / ${sourcePage}페이지`;
}

function getCardSourceLabel(card) {
  return getSourceLabel({
    sourceType: card.sourceType || "manual",
    sourcePage: card.sourcePage || 1,
  });
}

function updateCurrentSourceInfo() {
  if (!currentSourceInfo) return;

  const meta = getCurrentSourceMeta();
  currentSourceInfo.textContent = `현재 원본: ${getSourceLabel(meta)}`;
}

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
copyOcrToSentenceBtn.addEventListener("click", copyOcrTextToSentence);
clearOcrBtn.addEventListener("click", clearOcrText);
ocrText.addEventListener("input", saveOcrText);
cardSearchInput.addEventListener("input", (event) => {
  setCardSearchQuery(event.target.value);
});

clearSearchBtn.addEventListener("click", () => {
  clearCardSearch();
  cardSearchInput.focus();
});

prevPdfPageBtn.addEventListener("click", () => goToPdfPage(-1));
nextPdfPageBtn.addEventListener("click", () => goToPdfPage(1));

$("#resetDemoBtn").addEventListener("click", () => {
  if (
    !confirm(
      "내가 만든 문장과 메모를 초기화할까요? 교재형 데모 문장은 유지됩니다.",
    )
  )
    return;

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
  sessionStats = createEmptySessionStats();
  renderSessionStats();

  saveSourceMeta({
    sourceType: "manual",
    sourcePage: 1,
  });

  clearSelectedArea();
  setAreaSelectMode(false);
  setPhotoPreview(null);

  memoInput.value = "";
  ocrText.value = "";
  setOcrStatus("대기 중");
  updatePdfControls();
  renderUserCards();
  clearAnswers();

  studySets = normalizeStudySets([]);
  activeSetId = ALL_SETS_ID;
  saveStudySets();
  saveActiveSetId();
  renderSetOptions();
});

sentenceInput.addEventListener("input", () => {
  editorBlanks = [];
  updateEditorPreview();
  setEditorMessage("문장이 바뀌어서 기존 빈칸 선택을 초기화했습니다.");
});

memoInput.value = localStorage.getItem(MEMO_KEY) || "";
memoInput.addEventListener("input", () => {
  localStorage.setItem(MEMO_KEY, memoInput.value);
});

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

toggleSelectAreaBtn.addEventListener("click", () => {
  if (!hasVisibleSourceImage()) {
    setSelectionStatus("먼저 이미지 또는 PDF를 업로드하세요.", true);
    return;
  }

  setAreaSelectMode(!areaSelectMode);
});

ocrSelectedAreaBtn.addEventListener("click", runOcrFromSelectedArea);
clearSelectionBtn.addEventListener("click", clearSelectedArea);
pickRandomCardBtn.addEventListener("click", pickRandomCard);
clearRandomCardBtn.addEventListener("click", clearRandomCard);
resetSessionBtn.addEventListener("click", resetSessionStats);
extractPdfTextBtn.addEventListener("click", extractTextFromCurrentPdfPage);

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

createModeBtn.addEventListener("click", () => {
  setAppMode("create");
});

studyModeBtn.addEventListener("click", () => {
  setAppMode("study");
});
if (cardSearchInput) {
  cardSearchInput.value = cardSearchQuery;
}

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

const appReady = validateAppHealth();

if (appReady) {
  ensureExistingCardsHaveSet();
  renderSetOptions();

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
