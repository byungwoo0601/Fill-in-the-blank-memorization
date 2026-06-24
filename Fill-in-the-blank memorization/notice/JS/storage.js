function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn(error);
    return [];
  }
}

function saveCards() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userCards));
  } catch (error) {
    console.warn(error);
  }
}

function loadSourceMeta() {
  try {
    const raw = localStorage.getItem(SOURCE_META_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    if (!parsed) {
      return {
        sourceType: "manual",
        sourcePage: 1,
      };
    }

    return {
      sourceType: parsed.sourceType || "manual",
      sourcePage: Number(parsed.sourcePage) || 1,
    };
  } catch (error) {
    console.warn(error);
    return {
      sourceType: "manual",
      sourcePage: 1,
    };
  }
}

function saveSourceMeta(meta) {
  currentSourceMeta = {
    sourceType: meta.sourceType || "manual",
    sourcePage: Number(meta.sourcePage) || 1,
  };

  try {
    localStorage.setItem(SOURCE_META_KEY, JSON.stringify(currentSourceMeta));
  } catch (error) {
    console.warn(error);
  }
}

function createDefaultSet() {
  return {
    id: DEFAULT_SET_ID,
    title: "기본 세트",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function normalizeStudySets(sets) {
  const result = [];
  const usedIds = new Set();

  const pushSet = (set) => {
    if (!set || typeof set !== "object") return;

    const id = String(set.id || "").trim();
    const title = String(set.title || "").trim();

    if (!id || !title || usedIds.has(id)) return;

    usedIds.add(id);
    result.push({
      id,
      title,
      createdAt: set.createdAt || new Date().toISOString(),
      updatedAt: set.updatedAt || new Date().toISOString(),
    });
  };

  pushSet(createDefaultSet());

  if (Array.isArray(sets)) {
    sets.forEach(pushSet);
  }

  return result;
}

function loadStudySets() {
  try {
    const raw = localStorage.getItem(SETS_KEY);
    return normalizeStudySets(raw ? JSON.parse(raw) : []);
  } catch (error) {
    console.warn(error);
    return normalizeStudySets([]);
  }
}

function saveStudySets() {
  try {
    localStorage.setItem(SETS_KEY, JSON.stringify(studySets));
  } catch (error) {
    console.warn(error);
  }
}

function loadActiveSetId() {
  try {
    return localStorage.getItem(ACTIVE_SET_KEY) || ALL_SETS_ID;
  } catch (error) {
    console.warn(error);
    return ALL_SETS_ID;
  }
}

function saveActiveSetId() {
  try {
    localStorage.setItem(ACTIVE_SET_KEY, activeSetId);
  } catch (error) {
    console.warn(error);
  }
}

function getTodayKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function createEmptySessionStats() {
  return {
    date: getTodayKey(),
    gradedCardIds: [],
    gradeAttempts: 0,
    correct: 0,
    wrong: 0,
    empty: 0,
    lastGradedAt: "",
  };
}

function normalizeSessionStats(stats) {
  const today = getTodayKey();

  if (!stats || typeof stats !== "object" || stats.date !== today) {
    return createEmptySessionStats();
  }

  return {
    date: stats.date,
    gradedCardIds: Array.isArray(stats.gradedCardIds)
      ? stats.gradedCardIds
      : [],
    gradeAttempts: Number(stats.gradeAttempts) || 0,
    correct: Number(stats.correct) || 0,
    wrong: Number(stats.wrong) || 0,
    empty: Number(stats.empty) || 0,
    lastGradedAt: stats.lastGradedAt || "",
  };
}

function loadSessionStats() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return normalizeSessionStats(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.warn(error);
    return createEmptySessionStats();
  }
}

function saveSessionStats() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionStats));
  } catch (error) {
    console.warn(error);
  }
}

function canUseLocalStorage() {
  try {
    const key = "__cloze_storage_test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(error);
    return false;
  }
}
