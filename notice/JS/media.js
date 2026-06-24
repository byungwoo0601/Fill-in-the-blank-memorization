function setPhotoMessage(message, isError = false) {
  photoMessage.textContent = message;
  photoMessage.style.color = isError ? "#c23737" : "var(--blue-dark)";
}

function setPhotoPreview(dataUrl) {
  if (!dataUrl) {
    sourcePhotoImg.removeAttribute("src");
    sourcePhotoImg.classList.add("hidden");
    photoEmptyState.classList.remove("hidden");
    photoPreviewBox.classList.add("empty");
    setPhotoMessage("아직 업로드한 파일이 없습니다.");
    return;
  }

  sourcePhotoImg.src = dataUrl;
  sourcePhotoImg.classList.remove("hidden");
  photoEmptyState.classList.add("hidden");
  photoPreviewBox.classList.remove("empty");
  setPhotoMessage(
    "원본이 적용되었습니다. 원본을 보면서 아래 문장 만들기를 진행하세요.",
  );
}

function loadStoredPhoto() {
  const storedPhoto = localStorage.getItem(PHOTO_KEY);
  setPhotoPreview(storedPhoto);
  updatePdfControls();
}

function resizeImageFile(file, maxSize = 1600, quality = 0.84) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("이미지 파일만 이 처리 방식으로 업로드할 수 있습니다."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
      image.onload = () => {
        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height),
        );
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      image.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

function updateSelectionLayerVisibility() {
  if (!selectionLayer) return;

  const shouldShow =
    hasVisibleSourceImage() && (areaSelectMode || !!selectedArea);

  selectionLayer.classList.toggle("hidden", !shouldShow);
  selectionLayer.classList.toggle("enabled", areaSelectMode);
}

async function handlePhotoUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  clearSelectedArea();
  setAreaSelectMode(false);

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  try {
    if (isPdf) {
      await handlePdfUpload(file);
      return;
    }

    currentPdfDocument = null;
    currentPdfPage = 1;
    currentPdfTotalPages = 0;
    updatePdfControls();

    setPhotoMessage("이미지를 처리하는 중입니다...");
    const dataUrl = await resizeImageFile(file);

    try {
      localStorage.setItem(PHOTO_KEY, dataUrl);
      setPhotoPreview(dataUrl);

      saveSourceMetaAndRefresh({
        sourceType: "image",
        sourcePage: 1,
      });

      renderUserCards();
    } catch (storageError) {
      console.warn(storageError);
      setPhotoPreview(dataUrl);

      saveSourceMetaAndRefresh({
        sourceType: "image",
        sourcePage: 1,
      });

      renderUserCards();

      setPhotoMessage(
        "미리보기는 적용됐지만 브라우저 저장 용량 때문에 새로고침 후 유지되지 않을 수 있습니다.",
        true,
      );
    }
  } catch (error) {
    console.warn(error);
    setPhotoMessage(error.message || "파일 업로드에 실패했습니다.", true);
  } finally {
    photoInput.value = "";
  }
}

async function handlePdfUpload(file) {
  if (!window.pdfjsLib) {
    setPhotoMessage(
      "PDF 처리 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 CDN 차단 여부를 확인하세요.",
      true,
    );
    return;
  }

  setPhotoMessage("PDF를 불러오는 중입니다...");

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });

  currentPdfDocument = await loadingTask.promise;
  currentPdfPage = 1;
  currentPdfTotalPages = currentPdfDocument.numPages;

  await renderPdfPage(currentPdfPage);

  setPhotoMessage(
    `PDF를 불러왔습니다. 현재 ${currentPdfPage}페이지를 이미지로 변환했습니다.`,
  );
  updatePdfControls();
}

async function renderPdfPage(pageNumber) {
  if (!currentPdfDocument) return;

  const page = await currentPdfDocument.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const maxWidth = 1600;
  const scale = Math.min(2, maxWidth / baseViewport.width);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const dataUrl = canvas.toDataURL("image/jpeg", 0.88);

  let previewStorageFailed = false;

  try {
    localStorage.setItem(PHOTO_KEY, dataUrl);
  } catch (error) {
    console.warn(error);
    previewStorageFailed = true;
  }

  setPhotoPreview(dataUrl);

  if (previewStorageFailed) {
    setPhotoMessage(
      "PDF 페이지 미리보기는 적용됐지만 저장 용량 때문에 새로고침 후 유지되지 않을 수 있습니다.",
      true,
    );
  }

  saveSourceMetaAndRefresh({
    sourceType: "pdf",
    sourcePage: pageNumber,
  });

  renderUserCards();

  clearSelectedArea();
  setAreaSelectMode(false);
  updatePdfControls();
}

function updatePdfControls() {
  if (!pdfControls || !pdfPageInfo) return;

  const hasPdf = !!currentPdfDocument;
  pdfControls.classList.toggle("hidden", !hasPdf);

  if (extractPdfTextBtn) {
    extractPdfTextBtn.disabled = !hasPdf;
  }

  if (!hasPdf) {
    pdfPageInfo.textContent = "1 / 1";
    if (prevPdfPageBtn) prevPdfPageBtn.disabled = true;
    if (nextPdfPageBtn) nextPdfPageBtn.disabled = true;
    return;
  }

  pdfPageInfo.textContent = `${currentPdfPage} / ${currentPdfTotalPages}`;

  if (prevPdfPageBtn) prevPdfPageBtn.disabled = currentPdfPage <= 1;
  if (nextPdfPageBtn)
    nextPdfPageBtn.disabled = currentPdfPage >= currentPdfTotalPages;
}

async function goToPdfPage(direction) {
  if (!currentPdfDocument) return;

  const previousPage = currentPdfPage;
  const nextPage = currentPdfPage + direction;

  if (nextPage < 1 || nextPage > currentPdfTotalPages) return;

  currentPdfPage = nextPage;
  updatePdfControls();
  setPhotoMessage(`${currentPdfPage}페이지를 불러오는 중입니다...`);

  try {
    await renderPdfPage(currentPdfPage);
    setPhotoMessage(`${currentPdfPage}페이지를 이미지로 변환했습니다.`);
  } catch (error) {
    console.warn(error);
    currentPdfPage = previousPage;
    updatePdfControls();
    setPhotoMessage("PDF 페이지를 불러오지 못했습니다.", true);
  }
}

function removeStoredPhoto() {
  currentPdfDocument = null;
  currentPdfPage = 1;
  currentPdfTotalPages = 0;
  localStorage.removeItem(PHOTO_KEY);
  localStorage.removeItem(SOURCE_META_KEY);
  saveSourceMetaAndRefresh({
    sourceType: "manual",
    sourcePage: 1,
  });
  renderUserCards();

  clearSelectedArea();
  setAreaSelectMode(false);

  setPhotoPreview(null);
  updatePdfControls();
}

function setOcrStatus(message, isError = false) {
  ocrStatus.textContent = message;
  ocrStatus.style.color = isError ? "#c23737" : "var(--blue-dark)";
}

function loadStoredOcrText() {
  ocrText.value = localStorage.getItem(OCR_TEXT_KEY) || "";
  setOcrStatus(ocrText.value.trim() ? "이전 추출문 있음" : "대기 중");
}

function saveOcrText() {
  try {
    localStorage.setItem(OCR_TEXT_KEY, ocrText.value);
  } catch (error) {
    console.warn(error);
  }
}

function getCurrentPhotoDataUrl() {
  if (
    sourcePhotoImg &&
    sourcePhotoImg.src &&
    !sourcePhotoImg.classList.contains("hidden")
  ) {
    return sourcePhotoImg.src;
  }

  return localStorage.getItem(PHOTO_KEY) || "";
}

function cleanOcrText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function recognizeImageSource(
  imageSource,
  successMessage = "OCR 추출이 끝났습니다.",
) {
  if (!imageSource) {
    setPhotoMessage("OCR 처리할 이미지가 없습니다.", true);
    setOcrStatus("원본 없음", true);
    return;
  }

  if (!window.Tesseract || typeof window.Tesseract.recognize !== "function") {
    setPhotoMessage(
      "OCR 라이브러리를 불러오지 못했습니다. 인터넷 연결 또는 CDN 차단 여부를 확인하세요.",
      true,
    );
    setOcrStatus("OCR 로드 실패", true);
    return;
  }

  ocrBtn.disabled = true;
  if (ocrSelectedAreaBtn) {
    ocrSelectedAreaBtn.disabled = true;
  }

  setOcrStatus("준비 중");
  setPhotoMessage(
    "OCR을 준비하는 중입니다. 첫 실행은 언어 데이터 다운로드 때문에 오래 걸릴 수 있습니다...",
  );

  try {
    const result = await window.Tesseract.recognize(imageSource, "kor+eng", {
      logger: (info) => {
        if (!info || !info.status) return;

        const progress =
          typeof info.progress === "number"
            ? ` ${Math.round(info.progress * 100)}%`
            : "";

        setOcrStatus(`${info.status}${progress}`);
      },
    });

    const text = cleanOcrText(result && result.data ? result.data.text : "");
    ocrText.value = text;
    saveOcrText();

    if (!text) {
      setPhotoMessage(
        "OCR은 끝났지만 추출된 글자가 없습니다. 더 선명한 원본이나 더 넓은 영역으로 다시 시도하세요.",
        true,
      );
      setOcrStatus("추출 결과 없음", true);
      return;
    }

    setPhotoMessage(successMessage);
    setOcrStatus("추출 완료");
  } catch (error) {
    console.warn(error);
    setPhotoMessage(
      "OCR 처리에 실패했습니다. 파일이 너무 크거나, CDN/언어 데이터 다운로드가 막혔을 수 있습니다.",
      true,
    );
    setOcrStatus("OCR 실패", true);
  } finally {
    ocrBtn.disabled = false;

    if (ocrSelectedAreaBtn) {
      ocrSelectedAreaBtn.disabled = !selectedArea;
    }
  }
}

async function runOcrFromPhoto() {
  const imageSource = getCurrentPhotoDataUrl();

  if (!imageSource) {
    setPhotoMessage("먼저 교재 이미지나 PDF를 업로드하세요.", true);
    setOcrStatus("원본 없음", true);
    return;
  }

  await recognizeImageSource(
    imageSource,
    "전체 OCR 추출이 끝났습니다. 오타를 수정한 뒤 원문 문장에 넣어 빈칸을 지정하세요.",
  );
}

function normalizePdfTextContent(textContent) {
  if (!textContent || !Array.isArray(textContent.items)) {
    return "";
  }

  const items = textContent.items
    .filter((item) => item && typeof item.str === "string" && item.str.trim())
    .map((item) => ({
      text: item.str.trim(),
      x: Number(item.transform?.[4]) || 0,
      y: Number(item.transform?.[5]) || 0,
    }))
    .sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });

  const lines = [];
  const yThreshold = 4;

  items.forEach((item) => {
    let line = lines.find((entry) => Math.abs(entry.y - item.y) <= yThreshold);

    if (!line) {
      line = {
        y: item.y,
        items: [],
      };
      lines.push(line);
    }

    line.items.push(item);
  });

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) =>
      line.items
        .sort((a, b) => a.x - b.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

async function extractTextFromCurrentPdfPage() {
  if (!currentPdfDocument) {
    setPhotoMessage("먼저 텍스트가 포함된 PDF를 업로드하세요.", true);
    setOcrStatus("PDF 없음", true);
    return;
  }

  if (!currentPdfPage || currentPdfPage < 1) {
    setPhotoMessage("현재 PDF 페이지 정보를 찾지 못했습니다.", true);
    setOcrStatus("페이지 없음", true);
    return;
  }

  if (extractPdfTextBtn) {
    extractPdfTextBtn.disabled = true;
  }

  setOcrStatus("PDF 텍스트 추출 중");
  setPhotoMessage(
    `${currentPdfPage}페이지의 PDF 텍스트를 직접 추출하는 중입니다...`,
  );

  try {
    const page = await currentPdfDocument.getPage(currentPdfPage);
    const textContent = await page.getTextContent();
    const extractedText = normalizePdfTextContent(textContent);

    if (!extractedText) {
      setPhotoMessage(
        "이 페이지에서 직접 추출할 수 있는 텍스트가 없습니다. 스캔본 PDF라면 OCR을 사용하세요.",
        true,
      );
      setOcrStatus("추출 텍스트 없음", true);
      return;
    }

    ocrText.value = extractedText;
    saveOcrText();

    setPhotoMessage(
      "PDF 텍스트 직접 추출이 끝났습니다. 내용을 확인한 뒤 원문 문장에 넣어 빈칸을 지정하세요.",
    );
    setOcrStatus("PDF 텍스트 추출 완료");
  } catch (error) {
    console.warn(error);
    setPhotoMessage(
      "PDF 텍스트 직접 추출에 실패했습니다. 이 PDF는 OCR 방식이 더 적합할 수 있습니다.",
      true,
    );
    setOcrStatus("PDF 텍스트 추출 실패", true);
  } finally {
    updatePdfControls();
  }
}

function setSelectionStatus(message, isError = false) {
  if (!selectionStatus) return;

  selectionStatus.textContent = message;
  selectionStatus.style.color = isError ? "#c23737" : "var(--blue-dark)";
}

function hasVisibleSourceImage() {
  return (
    sourcePhotoImg &&
    sourcePhotoImg.src &&
    !sourcePhotoImg.classList.contains("hidden")
  );
}

function setAreaSelectMode(enabled) {
  areaSelectMode = enabled;

  if (!toggleSelectAreaBtn) return;

  updateSelectionLayerVisibility();

  toggleSelectAreaBtn.textContent = areaSelectMode
    ? "영역 선택 종료"
    : "OCR 영역 선택";

  if (areaSelectMode) {
    setSelectionStatus("이미지 위에서 OCR할 영역을 드래그하세요.");
  } else if (selectedArea) {
    setSelectionStatus(
      "선택 영역이 유지되어 있습니다. 선택 영역 OCR을 누를 수 있습니다.",
    );
  } else {
    setSelectionStatus("영역 선택 전");
  }
}

function clearSelectedArea() {
  selectedArea = null;
  selectionStartPoint = null;
  isSelectingArea = false;

  if (selectionBox) {
    selectionBox.classList.add("hidden");
    selectionBox.removeAttribute("style");
  }

  if (ocrSelectedAreaBtn) {
    ocrSelectedAreaBtn.disabled = true;
  }

  updateSelectionLayerVisibility();
  setSelectionStatus("영역 선택 전");
}

function getPreviewPoint(event) {
  const rect = photoPreviewBox.getBoundingClientRect();

  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

function getImageRectInPreview() {
  const previewRect = photoPreviewBox.getBoundingClientRect();
  const imageRect = sourcePhotoImg.getBoundingClientRect();

  return {
    left: imageRect.left - previewRect.left,
    top: imageRect.top - previewRect.top,
    width: imageRect.width,
    height: imageRect.height,
    right: imageRect.left - previewRect.left + imageRect.width,
    bottom: imageRect.top - previewRect.top + imageRect.height,
  };
}

function clampPointToImage(point) {
  const imageRect = getImageRectInPreview();

  return {
    x: clamp(point.x, imageRect.left, imageRect.right),
    y: clamp(point.y, imageRect.top, imageRect.bottom),
  };
}

function drawSelectionBox(area) {
  if (!selectionBox) return;

  selectionBox.classList.remove("hidden");
  selectionBox.style.left = `${area.left}px`;
  selectionBox.style.top = `${area.top}px`;
  selectionBox.style.width = `${area.width}px`;
  selectionBox.style.height = `${area.height}px`;
}

function makeAreaFromPoints(a, b) {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

function startAreaSelection(event) {
  if (!areaSelectMode || !hasVisibleSourceImage()) return;

  event.preventDefault();

  isSelectingArea = true;
  const point = clampPointToImage(getPreviewPoint(event));
  selectionStartPoint = point;
  selectedArea = null;

  drawSelectionBox({
    left: point.x,
    top: point.y,
    width: 0,
    height: 0,
  });

  if (ocrSelectedAreaBtn) {
    ocrSelectedAreaBtn.disabled = true;
  }

  selectionLayer.setPointerCapture(event.pointerId);
}

function moveAreaSelection(event) {
  if (!isSelectingArea || !selectionStartPoint) return;

  event.preventDefault();

  const point = clampPointToImage(getPreviewPoint(event));
  const area = makeAreaFromPoints(selectionStartPoint, point);

  drawSelectionBox(area);
}

function endAreaSelection(event) {
  if (!isSelectingArea || !selectionStartPoint) return;

  event.preventDefault();

  isSelectingArea = false;

  const point = clampPointToImage(getPreviewPoint(event));
  const area = makeAreaFromPoints(selectionStartPoint, point);

  if (area.width < 12 || area.height < 12) {
    clearSelectedArea();
    setSelectionStatus("선택 영역이 너무 작습니다. 다시 드래그하세요.", true);
    return;
  }

  selectedArea = area;
  drawSelectionBox(selectedArea);

  if (ocrSelectedAreaBtn) {
    ocrSelectedAreaBtn.disabled = false;
  }

  setSelectionStatus(
    `선택 완료: ${Math.round(area.width)}×${Math.round(area.height)}px`,
  );
}

function getSelectedAreaDataUrl() {
  if (!selectedArea || !hasVisibleSourceImage()) return "";

  const imageRect = getImageRectInPreview();

  const x1 = Math.max(selectedArea.left, imageRect.left);
  const y1 = Math.max(selectedArea.top, imageRect.top);
  const x2 = Math.min(selectedArea.left + selectedArea.width, imageRect.right);
  const y2 = Math.min(selectedArea.top + selectedArea.height, imageRect.bottom);

  const displayWidth = x2 - x1;
  const displayHeight = y2 - y1;

  if (displayWidth <= 0 || displayHeight <= 0) return "";

  const scaleX = sourcePhotoImg.naturalWidth / imageRect.width;
  const scaleY = sourcePhotoImg.naturalHeight / imageRect.height;

  const sourceX = Math.round((x1 - imageRect.left) * scaleX);
  const sourceY = Math.round((y1 - imageRect.top) * scaleY);
  const sourceWidth = Math.round(displayWidth * scaleX);
  const sourceHeight = Math.round(displayHeight * scaleY);

  const canvas = document.createElement("canvas");
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;

  const context = canvas.getContext("2d");
  context.drawImage(
    sourcePhotoImg,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  return canvas.toDataURL("image/jpeg", 0.92);
}

async function runOcrFromSelectedArea() {
  if (!selectedArea) {
    setSelectionStatus("먼저 OCR할 영역을 드래그해서 선택하세요.", true);
    return;
  }

  const areaImage = getSelectedAreaDataUrl();

  if (!areaImage) {
    setSelectionStatus("선택 영역을 이미지로 변환하지 못했습니다.", true);
    return;
  }

  await recognizeImageSource(
    areaImage,
    "선택 영역 OCR 추출이 끝났습니다. 오타를 수정한 뒤 원문 문장에 넣어 빈칸을 지정하세요.",
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function copyOcrTextToSentence() {
  const text = ocrText.value.trim();

  if (!text) {
    setPhotoMessage("원문 문장에 넣을 OCR 추출문이 없습니다.", true);
    return;
  }

  sentenceInput.value = text;
  editorBlanks = [];
  updateEditorPreview();
  setEditorMessage(
    "OCR 추출문을 원문 문장에 넣었습니다. 빈칸으로 만들 부분을 드래그하세요.",
  );
  sentenceInput.focus();
  sentenceInput.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearOcrText() {
  ocrText.value = "";
  localStorage.removeItem(OCR_TEXT_KEY);
  setOcrStatus("대기 중");
}

function saveSourceMetaAndRefresh(meta) {
  saveSourceMetaAndRefresh(meta);

  if (typeof updateCurrentSourceInfo === "function") {
    updateCurrentSourceInfo();
  }
}
