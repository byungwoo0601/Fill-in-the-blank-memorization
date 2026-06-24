function validateRequiredElements() {
  const requiredIds = [
    "createModeBtn",
    "studyModeBtn",
    "gradeBtn",
    "clearAnswersBtn",
    "showAllBtn",
    "exportDataBtn",
    "importDataBtn",
    "importDataInput",
    "resetDemoBtn",

    "summary",
    "modeDescription",
    "appHealthPanel",
    "appHealthTitle",
    "appHealthMessage",
    "sessionStatsText",
    "resetSessionBtn",

    "photoInput",
    "ocrBtn",
    "extractPdfTextBtn",
    "removePhotoBtn",
    "toggleSelectAreaBtn",
    "ocrSelectedAreaBtn",
    "clearSelectionBtn",
    "selectionStatus",
    "pdfControls",
    "prevPdfPageBtn",
    "nextPdfPageBtn",
    "pdfPageInfo",
    "photoMessage",
    "ocrText",
    "ocrStatus",
    "copyOcrToSentenceBtn",
    "clearOcrBtn",
    "photoPreviewBox",
    "photoEmptyState",
    "sourcePhotoImg",
    "selectionLayer",
    "selectionBox",

    "memoInput",
    "demoMainBox",
    "demoLines",
    "titleInput",
    "sentenceInput",
    "addBlankBtn",
    "undoBlankBtn",
    "clearEditorBtn",
    "saveCardBtn",
    "editorMessage",
    "blankCount",
    "editorPreview",
    "editBadge",

    "setFilterSelect",
    "newSetTitleInput",
    "addSetBtn",
    "renameSetBtn",
    "deleteSetBtn",
    "setStatus",

    "filterAllCardsBtn",
    "filterCurrentPageCardsBtn",
    "filterWrongCardsBtn",
    "pickRandomCardBtn",
    "clearRandomCardBtn",
    "currentSourceInfo",
    "randomStatus",

    "cardSearchInput",
    "clearSearchBtn",
    "searchStatus",

    "contentRoot",
  ];

  return requiredIds.filter((id) => !document.getElementById(id));
}

function validateExternalLibraries() {
  const warnings = [];

  if (!window.pdfjsLib) {
    warnings.push(
      "PDF.js를 불러오지 못했습니다. PDF 업로드와 PDF 텍스트 추출 기능이 제한됩니다.",
    );
  }

  if (!window.Tesseract) {
    warnings.push("Tesseract.js를 불러오지 못했습니다. OCR 기능이 제한됩니다.");
  }

  return warnings;
}

function setAppHealth(type, title, message) {
  if (!appHealthPanel || !appHealthTitle || !appHealthMessage) {
    console.warn("[App Health] 상태 패널 요소를 찾지 못했습니다.", {
      appHealthPanel,
      appHealthTitle,
      appHealthMessage,
    });
    return;
  }

  appHealthPanel.classList.remove("ok", "warn", "error");

  if (type) {
    appHealthPanel.classList.add(type);
  }

  appHealthTitle.textContent = title;
  appHealthMessage.textContent = message;
}

function validateAppHealth() {
  const missingElements = validateRequiredElements();
  const libraryWarnings = validateExternalLibraries();
  const storageOk = canUseLocalStorage();

  if (missingElements.length > 0) {
    setAppHealth(
      "error",
      "앱 구성 오류",
      `HTML에서 필수 요소가 누락되었습니다: ${missingElements.join(", ")}`,
    );
    console.error("[App Health] Missing required elements:", missingElements);
    return false;
  }

  if (!storageOk) {
    setAppHealth(
      "error",
      "브라우저 저장소 오류",
      "localStorage를 사용할 수 없습니다. 데이터 저장, JSON 백업 전 임시 저장, 학습 기록 기능이 제한됩니다.",
    );
    return false;
  }

  if (libraryWarnings.length > 0) {
    setAppHealth("warn", "일부 기능 제한", libraryWarnings.join(" "));
    return true;
  }

  setAppHealth(
    "ok",
    "앱 상태 정상",
    "필수 요소, 브라우저 저장소, PDF/OCR 라이브러리가 정상적으로 준비되었습니다.",
  );

  return true;
}
