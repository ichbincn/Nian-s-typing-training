const STORAGE_KEYS = {
  preferences: "ielts-typing-preferences",
  lastResult: "ielts-typing-last-result",
  history: "ielts-typing-history",
  historyClearVersion: "ielts-typing-history-clear-version",
};

const ENCOURAGEMENTS = [
  "很棒，继续保持这个节奏！",
  "速度和准确率都不错，再练一篇吧。",
  "今天也在稳稳进步。",
  "小陈认证：这篇打得真不错。",
];

const state = {
  texts: [],
  filteredTexts: [],
  currentText: null,
  currentIndex: 0,
  stats: createEmptyStats(),
  timer: {
    elapsedMs: 0,
    startedAt: null,
    intervalId: null,
    isRunning: false,
  },
  practiceStarted: false,
  isPaused: false,
  isCompleted: false,
  hasLoaded: false,
  history: [],
  preferences: {
    theme: "light",
    showHints: true,
    showComparison: true,
    autoFocus: true,
    fontSize: 19,
    examMode: false,
  },
};

const elements = {
  typeFilter: document.getElementById("typeFilter"),
  topicFilter: document.getElementById("topicFilter"),
  task2Shortcut: document.getElementById("task2Shortcut"),
  prevButton: document.getElementById("prevButton"),
  nextButton: document.getElementById("nextButton"),
  randomButton: document.getElementById("randomButton"),
  startButton: document.getElementById("startButton"),
  pauseButton: document.getElementById("pauseButton"),
  resumeButton: document.getElementById("resumeButton"),
  resetButton: document.getElementById("resetButton"),
  examModeButton: document.getElementById("examModeButton"),
  themeButton: document.getElementById("themeButton"),
  hintToggle: document.getElementById("hintToggle"),
  compareToggle: document.getElementById("compareToggle"),
  focusToggle: document.getElementById("focusToggle"),
  fontSizeRange: document.getElementById("fontSizeRange"),
  fontSizeValue: document.getElementById("fontSizeValue"),
  textTitle: document.getElementById("textTitle"),
  textPrompt: document.getElementById("textPrompt"),
  metaType: document.getElementById("metaType"),
  metaTopic: document.getElementById("metaTopic"),
  metaWordCount: document.getElementById("metaWordCount"),
  metaDifficulty: document.getElementById("metaDifficulty"),
  practiceStatus: document.getElementById("practiceStatus"),
  emptyState: document.getElementById("emptyState"),
  loadMessage: document.getElementById("loadMessage"),
  referenceText: document.getElementById("referenceText"),
  overflowNotice: document.getElementById("overflowNotice"),
  typingInput: document.getElementById("typingInput"),
  elapsedTime: document.getElementById("elapsedTime"),
  wpmValue: document.getElementById("wpmValue"),
  cpmValue: document.getElementById("cpmValue"),
  totalCharsValue: document.getElementById("totalCharsValue"),
  correctCharsValue: document.getElementById("correctCharsValue"),
  errorCharsValue: document.getElementById("errorCharsValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  errorRateValue: document.getElementById("errorRateValue"),
  hintPanel: document.getElementById("hintPanel"),
  recentResult: document.getElementById("recentResult"),
  historyButton: document.getElementById("historyButton"),
  resultModal: document.getElementById("resultModal"),
  closeModalButton: document.getElementById("closeModalButton"),
  historyModal: document.getElementById("historyModal"),
  closeHistoryModalButton: document.getElementById("closeHistoryModalButton"),
  resultEncouragement: document.getElementById("resultEncouragement"),
  resultTime: document.getElementById("resultTime"),
  resultWpm: document.getElementById("resultWpm"),
  resultCpm: document.getElementById("resultCpm"),
  resultTotal: document.getElementById("resultTotal"),
  resultCorrect: document.getElementById("resultCorrect"),
  resultError: document.getElementById("resultError"),
  resultAccuracy: document.getElementById("resultAccuracy"),
  resultErrorRate: document.getElementById("resultErrorRate"),
  historySummary: document.getElementById("historySummary"),
  historyChart: document.getElementById("historyChart"),
  historyInsight: document.getElementById("historyInsight"),
  historyList: document.getElementById("historyList"),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  clearStoredHistoryOnce();
  loadPreferences();
  applyPreferences();
  loadHistoryRecords();
  restoreRecentResult();
  closeResultModal();
  closeHistoryModal();
  setGlobalDisabledState(true);
  bindEvents();
  updateStatsDisplay(createEmptyStats());
  updatePracticeStatus("未开始");
  await loadTexts();
}

function bindEvents() {
  elements.typeFilter.addEventListener("change", handleFilterChange);
  elements.topicFilter.addEventListener("change", handleFilterChange);
  elements.task2Shortcut.addEventListener("click", () => {
    elements.typeFilter.value = "task2";
    handleFilterChange();
  });

  elements.prevButton.addEventListener("click", () => changeTextByStep(-1));
  elements.nextButton.addEventListener("click", () => changeTextByStep(1));
  elements.randomButton.addEventListener("click", selectRandomText);

  elements.startButton.addEventListener("click", startPractice);
  elements.pauseButton.addEventListener("click", pausePractice);
  elements.resumeButton.addEventListener("click", resumePractice);
  elements.resetButton.addEventListener("click", () => resetPractice(true));

  elements.typingInput.addEventListener("input", handleInputChange);
  elements.typingInput.addEventListener("keydown", handleInputKeydown);
  elements.typingInput.addEventListener("paste", handlePasteBlocked);
  elements.typingInput.addEventListener("drop", handleDropBlocked);

  elements.hintToggle.addEventListener("change", () => {
    state.preferences.showHints = elements.hintToggle.checked;
    applyPreferences();
    savePreferences();
  });

  elements.compareToggle.addEventListener("change", () => {
    state.preferences.showComparison = elements.compareToggle.checked;
    applyPreferences();
    savePreferences();
    renderReferenceText();
  });

  elements.focusToggle.addEventListener("change", () => {
    state.preferences.autoFocus = elements.focusToggle.checked;
    savePreferences();
  });

  elements.fontSizeRange.addEventListener("input", () => {
    state.preferences.fontSize = Number(elements.fontSizeRange.value);
    applyPreferences();
    savePreferences();
  });

  elements.themeButton.addEventListener("click", () => {
    state.preferences.theme = state.preferences.theme === "light" ? "dark" : "light";
    applyPreferences();
    savePreferences();
  });

  elements.examModeButton.addEventListener("click", () => {
    state.preferences.examMode = !state.preferences.examMode;
    applyPreferences();
    savePreferences();
  });

  elements.closeModalButton.addEventListener("click", closeResultModal);
  elements.historyButton.addEventListener("click", showHistoryModal);
  elements.closeHistoryModalButton.addEventListener("click", closeHistoryModal);
  elements.resultModal.addEventListener("click", (event) => {
    if (event.target === elements.resultModal) {
      closeResultModal();
    }
  });
  elements.historyModal.addEventListener("click", (event) => {
    if (event.target === elements.historyModal) {
      closeHistoryModal();
    }
  });
  document.addEventListener("keydown", handleGlobalKeydown);
}

async function loadTexts() {
  elements.loadMessage.textContent = "题库加载中...";

  try {
    const result = await fetchTextsWithFallbacks();
    state.texts = Array.isArray(result.texts) ? result.texts : [];
    state.hasLoaded = true;

    if (!state.texts.length) {
      renderEmptyLibrary("题库已加载，但内容为空。请检查 sample-texts.json。");
      return;
    }

    elements.loadMessage.textContent =
      result.source === "embedded" ? "已加载内置题库（本地模式）" : "题库已加载";
    toggleDataControls(true);
    applyFilters(true);
  } catch (error) {
    console.error("Failed to load sample texts:", error);
    renderEmptyLibrary(
      "未能读取 sample-texts.json，也没有找到可用的内置题库。"
    );
  }
}

async function fetchTextsWithFallbacks() {
  try {
    return {
      texts: await fetchTextsWithFetch(),
      source: "json",
    };
  } catch (fetchError) {
    try {
      return {
        texts: await fetchTextsWithXHR(),
        source: "json",
      };
    } catch (xhrError) {
      try {
        return {
          texts: await fetchTextsWithIframe(),
          source: "json",
        };
      } catch (iframeError) {
        const embeddedTexts = getEmbeddedTexts();

        if (embeddedTexts.length) {
          return {
            texts: embeddedTexts,
            source: "embedded",
          };
        }

        throw iframeError;
      }
    }
  }
}

async function fetchTextsWithFetch() {
  const response = await fetch("./sample-texts.json", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Fetch response was not ok.");
  }

  return response.json();
}

function fetchTextsWithXHR() {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", "./sample-texts.json", true);
    request.responseType = "text";

    request.onload = () => {
      if (request.status === 0 || (request.status >= 200 && request.status < 300)) {
        try {
          resolve(JSON.parse(request.responseText));
        } catch (parseError) {
          reject(parseError);
        }
      } else {
        reject(new Error("XHR request failed."));
      }
    };

    request.onerror = () => reject(new Error("XHR request error."));
    request.send();
  });
}

function fetchTextsWithIframe() {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = "./sample-texts.json";

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        const rawText = doc?.body?.innerText?.trim() || doc?.body?.textContent?.trim();
        iframe.remove();

        if (!rawText) {
          reject(new Error("Iframe response empty."));
          return;
        }

        resolve(JSON.parse(rawText));
      } catch (error) {
        iframe.remove();
        reject(error);
      }
    };

    iframe.onerror = () => {
      iframe.remove();
      reject(new Error("Iframe request failed."));
    };

    document.body.appendChild(iframe);
  });
}

function handleFilterChange() {
  applyFilters(false);
}

function applyFilters(isInitialLoad) {
  const typeValue = elements.typeFilter.value;
  const topicValue = elements.topicFilter.value;

  state.filteredTexts = state.texts.filter((text) => {
    const typeMatch = typeValue === "all" || text.type === typeValue;
    const topicMatch = topicValue === "all" || text.topic === topicValue;
    return typeMatch && topicMatch;
  });

  if (!state.filteredTexts.length) {
    state.currentText = null;
    state.currentIndex = 0;
    resetPractice(false);
    renderCurrentText();
    toggleContentControls(false);
    return;
  }

  toggleContentControls(true);

  let nextIndex = 0;

  if (!isInitialLoad && state.currentText) {
    const sameTextIndex = state.filteredTexts.findIndex((text) => text.id === state.currentText.id);
    nextIndex = sameTextIndex >= 0 ? sameTextIndex : 0;
  }

  setCurrentTextByIndex(nextIndex);
}

function changeTextByStep(step) {
  if (!state.filteredTexts.length) {
    return;
  }

  const nextIndex =
    (state.currentIndex + step + state.filteredTexts.length) % state.filteredTexts.length;
  setCurrentTextByIndex(nextIndex);
}

function selectRandomText() {
  if (!state.filteredTexts.length) {
    return;
  }

  if (state.filteredTexts.length === 1) {
    setCurrentTextByIndex(0);
    return;
  }

  let randomIndex = state.currentIndex;

  while (randomIndex === state.currentIndex) {
    randomIndex = Math.floor(Math.random() * state.filteredTexts.length);
  }

  setCurrentTextByIndex(randomIndex);
}

function setCurrentTextByIndex(index) {
  state.currentIndex = index;
  state.currentText = state.filteredTexts[index] || null;
  resetPractice(false);
  renderCurrentText();
  renderReferenceText();
  refreshControls();

  if (state.preferences.autoFocus && state.currentText) {
    elements.typingInput.focus();
  }
}

function renderCurrentText() {
  if (!state.currentText) {
    elements.textTitle.textContent = "暂无可练习题目";
    elements.textPrompt.textContent = "请调整筛选条件，或检查本地题库内容。";
    elements.metaType.textContent = "-";
    elements.metaTopic.textContent = "-";
    elements.metaWordCount.textContent = "0";
    elements.metaDifficulty.textContent = "-";
    elements.emptyState.hidden = false;
    elements.referenceText.textContent = "当前没有可显示的范文。";
    elements.overflowNotice.hidden = true;
    return;
  }

  elements.emptyState.hidden = true;
  elements.textTitle.textContent = state.currentText.title || "未命名题目";
  elements.textPrompt.textContent = state.currentText.prompt || "暂无题干说明。";
  elements.metaType.textContent = formatTaskType(state.currentText.type);
  elements.metaTopic.textContent = state.currentText.topic || "-";
  elements.metaWordCount.textContent = String(state.currentText.wordCount || countWords(state.currentText.content));
  elements.metaDifficulty.textContent = state.currentText.difficulty || "-";
}

function renderReferenceText() {
  const content = state.currentText?.content || "";
  const input = elements.typingInput.value;

  if (!content) {
    elements.referenceText.textContent = "当前文章内容为空。";
    elements.overflowNotice.hidden = true;
    return;
  }

  if (!state.preferences.showComparison) {
    elements.referenceText.textContent = content;
  } else {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < content.length; index += 1) {
      const charSpan = document.createElement("span");
      charSpan.className = "char pending";
      charSpan.textContent = content[index];

      if (index < input.length) {
        charSpan.className =
          input[index] === content[index] ? "char correct" : "char incorrect";
      }

      fragment.appendChild(charSpan);
    }

    elements.referenceText.innerHTML = "";
    elements.referenceText.appendChild(fragment);
  }

  if (input.length > content.length) {
    const extraText = input.slice(content.length);
    elements.overflowNotice.hidden = false;
    elements.overflowNotice.innerHTML = `<strong>超出原文长度的输入：</strong> <span class="char extra">${escapeHtml(
      extraText
    )}</span>`;
  } else {
    elements.overflowNotice.hidden = true;
  }
}

function handleInputKeydown(event) {
  if (!state.currentText || state.isCompleted) {
    return;
  }

  if (event.key === "Escape") {
    closeResultModal();
  }
}

function handlePasteBlocked(event) {
  event.preventDefault();
}

function handleDropBlocked(event) {
  event.preventDefault();
}

function handleGlobalKeydown(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (!elements.resultModal.hidden) {
    closeResultModal();
  }

  if (!elements.historyModal.hidden) {
    closeHistoryModal();
  }
}

function handleInputChange() {
  if (!state.currentText || state.isCompleted) {
    return;
  }

  if (!state.practiceStarted && elements.typingInput.value.length > 0) {
    startPractice();
  }

  state.stats = calculateStats(elements.typingInput.value, state.currentText.content, state.timer.elapsedMs);
  updateStatsDisplay(state.stats);
  renderReferenceText();
  checkCompletion();
}

function startPractice() {
  if (!state.currentText || state.isCompleted || state.timer.isRunning) {
    return;
  }

  state.practiceStarted = true;
  state.isPaused = false;
  updatePracticeStatus("进行中");
  runTimer();
  refreshControls();

  if (state.preferences.autoFocus) {
    elements.typingInput.focus();
  }
}

function pausePractice() {
  if (!state.timer.isRunning || state.isCompleted) {
    return;
  }

  stopTimer();
  state.isPaused = true;
  updatePracticeStatus("已暂停");
  elements.typingInput.disabled = true;
  refreshControls();
}

function resumePractice() {
  if (!state.currentText || !state.practiceStarted || !state.isPaused || state.isCompleted) {
    return;
  }

  state.isPaused = false;
  elements.typingInput.disabled = false;
  runTimer();
  updatePracticeStatus("进行中");
  refreshControls();

  if (state.preferences.autoFocus) {
    elements.typingInput.focus();
  }
}

function resetPractice(shouldClearFocus) {
  stopTimer();
  state.timer.elapsedMs = 0;
  state.practiceStarted = false;
  state.isPaused = false;
  state.isCompleted = false;
  elements.typingInput.disabled = !state.currentText;
  elements.typingInput.value = "";
  state.stats = createEmptyStats();
  updateStatsDisplay(state.stats);
  updatePracticeStatus(state.currentText ? "未开始" : "无题目");
  renderReferenceText();
  refreshControls();
  closeResultModal();

  if (!shouldClearFocus && state.preferences.autoFocus && state.currentText) {
    elements.typingInput.focus();
  }
}

function checkCompletion() {
  if (!state.currentText) {
    return;
  }

  const input = elements.typingInput.value;
  const content = state.currentText.content;

  if (input.length !== content.length) {
    return;
  }

  if (input === content) {
    state.isCompleted = true;
    stopTimer();
    updatePracticeStatus("练习完成");
    elements.typingInput.disabled = true;
    refreshControls();
    showResultModal();
    savePracticeResult();
  }
}

function runTimer() {
  if (state.timer.isRunning) {
    return;
  }

  state.timer.startedAt = Date.now();
  state.timer.isRunning = true;
  elements.typingInput.disabled = false;

  state.timer.intervalId = window.setInterval(() => {
    const now = Date.now();
    state.timer.elapsedMs += now - state.timer.startedAt;
    state.timer.startedAt = now;
    state.stats = calculateStats(
      elements.typingInput.value,
      state.currentText?.content || "",
      state.timer.elapsedMs
    );
    updateStatsDisplay(state.stats);
  }, 200);
}

function stopTimer() {
  if (!state.timer.isRunning) {
    return;
  }

  const now = Date.now();
  state.timer.elapsedMs += now - state.timer.startedAt;
  state.timer.startedAt = null;
  state.timer.isRunning = false;

  if (state.timer.intervalId) {
    window.clearInterval(state.timer.intervalId);
    state.timer.intervalId = null;
  }

  state.stats = calculateStats(
    elements.typingInput.value,
    state.currentText?.content || "",
    state.timer.elapsedMs
  );
  updateStatsDisplay(state.stats);
}

function calculateStats(input, content, elapsedMs) {
  if (!input) {
    return {
      ...createEmptyStats(),
      elapsedMs,
    };
  }

  let correctChars = 0;
  let errorChars = 0;

  for (let index = 0; index < input.length; index += 1) {
    const targetChar = content[index];

    if (targetChar !== undefined && input[index] === targetChar) {
      correctChars += 1;
    } else {
      errorChars += 1;
    }
  }

  const totalChars = input.length;
  const elapsedMinutes = elapsedMs > 0 ? elapsedMs / 60000 : 0;
  const accuracy = totalChars > 0 ? (correctChars / totalChars) * 100 : 0;
  const errorRate = totalChars > 0 ? (errorChars / totalChars) * 100 : 0;
  const wpm = elapsedMinutes > 0 ? correctChars / 5 / elapsedMinutes : 0;
  const cpm = elapsedMinutes > 0 ? correctChars / elapsedMinutes : 0;

  return {
    elapsedMs,
    totalChars,
    correctChars,
    errorChars,
    accuracy,
    errorRate,
    wpm,
    cpm,
  };
}

function updateStatsDisplay(stats) {
  elements.elapsedTime.textContent = formatElapsedTime(stats.elapsedMs || 0);
  elements.wpmValue.textContent = formatDecimal(stats.wpm);
  elements.cpmValue.textContent = formatDecimal(stats.cpm);
  elements.totalCharsValue.textContent = String(stats.totalChars || 0);
  elements.correctCharsValue.textContent = String(stats.correctChars || 0);
  elements.errorCharsValue.textContent = String(stats.errorChars || 0);
  elements.accuracyValue.textContent = `${formatDecimal(stats.accuracy)}%`;
  elements.errorRateValue.textContent = `${formatDecimal(stats.errorRate)}%`;
}

function refreshControls() {
  const hasText = Boolean(state.currentText);

  elements.startButton.disabled =
    !hasText || state.timer.isRunning || state.isCompleted;
  elements.pauseButton.disabled =
    !hasText || !state.timer.isRunning || state.isCompleted;
  elements.resumeButton.disabled =
    !hasText || !state.practiceStarted || !state.isPaused || state.isCompleted;
  elements.resetButton.disabled = !hasText;
  elements.prevButton.disabled = !hasText || state.filteredTexts.length <= 1;
  elements.nextButton.disabled = !hasText || state.filteredTexts.length <= 1;
  elements.randomButton.disabled = !hasText || state.filteredTexts.length <= 1;
  elements.examModeButton.disabled = !hasText;
}

function updatePracticeStatus(label) {
  elements.practiceStatus.textContent = label;
}

function setGlobalDisabledState(disabled) {
  document.querySelectorAll("[data-requires-data='true']").forEach((element) => {
    element.disabled = disabled;
  });
  document.querySelectorAll("[data-requires-content='true']").forEach((element) => {
    element.disabled = disabled;
  });
}

function toggleDataControls(enabled) {
  document.querySelectorAll("[data-requires-data='true']").forEach((element) => {
    element.disabled = !enabled;
  });
}

function toggleContentControls(enabled) {
  document.querySelectorAll("[data-requires-content='true']").forEach((element) => {
    element.disabled = !enabled;
  });
  elements.typingInput.disabled = !enabled;
  refreshControls();
}

function renderEmptyLibrary(message) {
  state.currentText = null;
  state.filteredTexts = [];
  state.hasLoaded = true;
  elements.loadMessage.textContent = message;
  elements.emptyState.hidden = false;
  elements.textTitle.textContent = "题库暂不可用";
  elements.textPrompt.textContent = message;
  elements.referenceText.textContent = message;
  elements.typingInput.disabled = true;
  toggleContentControls(false);
  updatePracticeStatus("无题目");
}

function showResultModal() {
  const stats = state.stats;

  elements.resultEncouragement.textContent =
    ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
  elements.resultTime.textContent = formatElapsedTime(stats.elapsedMs);
  elements.resultWpm.textContent = formatDecimal(stats.wpm);
  elements.resultCpm.textContent = formatDecimal(stats.cpm);
  elements.resultTotal.textContent = String(stats.totalChars);
  elements.resultCorrect.textContent = String(stats.correctChars);
  elements.resultError.textContent = String(stats.errorChars);
  elements.resultAccuracy.textContent = `${formatDecimal(stats.accuracy)}%`;
  elements.resultErrorRate.textContent = `${formatDecimal(stats.errorRate)}%`;
  elements.resultModal.hidden = false;
}

function closeResultModal() {
  elements.resultModal.hidden = true;
}

function closeHistoryModal() {
  elements.historyModal.hidden = true;
}

function showHistoryModal() {
  renderHistoryModal();
  elements.historyModal.hidden = false;
}

function savePracticeResult() {
  if (!state.currentText) {
    return;
  }

  const payload = {
    id: `${state.currentText.id}-${Date.now()}`,
    title: state.currentText.title,
    type: formatTaskType(state.currentText.type),
    topic: state.currentText.topic || "-",
    wpm: Number.parseFloat(formatDecimal(state.stats.wpm)),
    cpm: Number.parseFloat(formatDecimal(state.stats.cpm)),
    accuracy: Number.parseFloat(formatDecimal(state.stats.accuracy)),
    errorRate: Number.parseFloat(formatDecimal(state.stats.errorRate)),
    totalChars: state.stats.totalChars,
    correctChars: state.stats.correctChars,
    errorChars: state.stats.errorChars,
    time: formatElapsedTime(state.stats.elapsedMs),
    elapsedMs: state.stats.elapsedMs,
    completedAt: new Date().toLocaleString(),
  };

  state.history.push(payload);
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
  localStorage.setItem(STORAGE_KEYS.lastResult, JSON.stringify(payload));
  restoreRecentResult();

  if (!elements.historyModal.hidden) {
    renderHistoryModal();
  }
}

function restoreRecentResult() {
  const result = getLatestHistoryResult();

  if (!result) {
    elements.recentResult.classList.add("empty-result");
    elements.recentResult.innerHTML = "还没有完成记录，开始第一篇练习吧。";
    return;
  }

  try {
    elements.recentResult.classList.remove("empty-result");
    const bestWpm = getBestWpm(state.history);
    const speedMessage = getSpeedDistanceMessage(result.wpm).short;
    elements.recentResult.innerHTML = `
      <strong>${escapeHtml(result.title || "最近一篇练习")}</strong>
      <div>题型：${escapeHtml(result.type || "-")} | 主题：${escapeHtml(result.topic || "-")}</div>
      <div class="recent-meta">
        <div>最近一次 WPM：${escapeHtml(formatDecimal(result.wpm))}</div>
        <div>最近一次准确率：${escapeHtml(formatDecimal(result.accuracy))}%</div>
        <div>历史最佳 WPM：${escapeHtml(formatDecimal(bestWpm))}</div>
        <div>累计完成篇数：${escapeHtml(String(state.history.length))}</div>
        <div>速度状态：${escapeHtml(speedMessage)}</div>
        <div>完成时间：${escapeHtml(result.completedAt || "-")}</div>
      </div>
    `;
  } catch (error) {
    console.warn("Failed to restore recent result:", error);
  }
}

function clearStoredHistoryOnce() {
  const currentVersion = "2026-04-01-clear-history";
  const clearedVersion = localStorage.getItem(STORAGE_KEYS.historyClearVersion);

  if (clearedVersion === currentVersion) {
    return;
  }

  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.lastResult);
  localStorage.setItem(STORAGE_KEYS.historyClearVersion, currentVersion);
  state.history = [];
}

function loadHistoryRecords() {
  const rawHistory = localStorage.getItem(STORAGE_KEYS.history);

  if (rawHistory) {
    try {
      const parsedHistory = JSON.parse(rawHistory);
      state.history = Array.isArray(parsedHistory) ? parsedHistory : [];
      return;
    } catch (error) {
      console.warn("Failed to parse history records:", error);
    }
  }

  const rawLatest = localStorage.getItem(STORAGE_KEYS.lastResult);

  if (!rawLatest) {
    state.history = [];
    return;
  }

  try {
    const latest = JSON.parse(rawLatest);
    state.history = [
      {
        id: `legacy-${Date.now()}`,
        title: latest.title || "最近一篇练习",
        type: latest.type || "-",
        topic: latest.topic || "-",
        wpm: Number.parseFloat(latest.wpm) || 0,
        cpm: Number.parseFloat(latest.cpm) || 0,
        accuracy: Number.parseFloat(String(latest.accuracy).replace("%", "")) || 0,
        errorRate: Number.parseFloat(String(latest.errorRate).replace("%", "")) || 0,
        totalChars: latest.totalChars || 0,
        correctChars: latest.correctChars || 0,
        errorChars: latest.errorChars || 0,
        time: latest.time || "00:00",
        elapsedMs: latest.elapsedMs || 0,
        completedAt: latest.completedAt || "-",
      },
    ];
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
  } catch (error) {
    console.warn("Failed to migrate recent result into history:", error);
    state.history = [];
  }
}

function getLatestHistoryResult() {
  if (!state.history.length) {
    return null;
  }

  return state.history[state.history.length - 1];
}

function renderHistoryModal() {
  if (!state.history.length) {
    elements.historySummary.innerHTML = `
      <div class="history-summary-item">
        <span>累计练习</span>
        <strong>0 次</strong>
      </div>
      <div class="history-summary-item">
        <span>平均 WPM</span>
        <strong>0.0</strong>
      </div>
      <div class="history-summary-item">
        <span>最佳 WPM</span>
        <strong>0.0</strong>
      </div>
      <div class="history-summary-item">
        <span>平均准确率</span>
        <strong>0.0%</strong>
      </div>
    `;
    elements.historyChart.className = "history-chart-empty";
    elements.historyChart.textContent = "还没有历史数据。";
    elements.historyInsight.textContent = "完成一次练习后，这里会显示速度距离和鼓励语。";
    elements.historyList.className = "history-list empty-result";
    elements.historyList.textContent = "还没有历史记录。";
    return;
  }

  const latest = getLatestHistoryResult();
  const averageWpm = calculateAverage(state.history, "wpm");
  const bestWpm = getBestWpm(state.history);
  const averageAccuracy = calculateAverage(state.history, "accuracy");

  elements.historySummary.innerHTML = `
    <div class="history-summary-item">
      <span>累计练习</span>
      <strong>${state.history.length} 次</strong>
    </div>
    <div class="history-summary-item">
      <span>平均 WPM</span>
      <strong>${formatDecimal(averageWpm)}</strong>
    </div>
    <div class="history-summary-item">
      <span>最佳 WPM</span>
      <strong>${formatDecimal(bestWpm)}</strong>
    </div>
    <div class="history-summary-item">
      <span>平均准确率</span>
      <strong>${formatDecimal(averageAccuracy)}%</strong>
    </div>
  `;

  elements.historyChart.className = "history-chart";
  elements.historyChart.innerHTML = buildHistoryChartSvg(state.history);
  elements.historyInsight.textContent = buildHistoryInsight(state.history);
  elements.historyList.className = "history-list";
  elements.historyList.innerHTML = state.history
    .slice()
    .reverse()
    .map((record, index) => {
      const order = state.history.length - index;
      return `
        <article class="history-record">
          <strong>第 ${order} 次练习：${escapeHtml(record.title)}</strong>
          <div class="history-record-meta">
            <div>题型：${escapeHtml(record.type)} | 主题：${escapeHtml(record.topic || "-")}</div>
            <div>WPM：${escapeHtml(formatDecimal(record.wpm))} | 准确率：${escapeHtml(
              formatDecimal(record.accuracy)
            )}% | 用时：${escapeHtml(record.time)}</div>
            <div>完成时间：${escapeHtml(record.completedAt)}</div>
          </div>
        </article>
      `;
    })
    .join("");

  if (!latest) {
    elements.historyInsight.textContent = "完成一次练习后，这里会显示速度距离和鼓励语。";
  }
}

function calculateAverage(records, key) {
  if (!records.length) {
    return 0;
  }

  const total = records.reduce((sum, record) => sum + (Number(record[key]) || 0), 0);
  return total / records.length;
}

function getBestWpm(records) {
  if (!records.length) {
    return 0;
  }

  return Math.max(...records.map((record) => Number(record.wpm) || 0));
}

function getSpeedDistanceMessage(wpm) {
  const speed = Number(wpm) || 0;

  if (speed < 40) {
    return {
      short: `距离理想下限还差 ${formatDecimal(40 - speed)} WPM`,
      long: `最近一次速度是 ${formatDecimal(speed)} WPM，距离雅思机试理想下限 40 WPM 还差 ${formatDecimal(
        40 - speed
      )}。再稳一点提速，就会更接近考试节奏。`,
    };
  }

  if (speed <= 60) {
    return {
      short: "已经进入雅思机试理想速度区间",
      long: `最近一次速度是 ${formatDecimal(speed)} WPM，已经进入雅思机试理想速度区间 40-60 WPM。保持准确率，你现在的节奏很不错。`,
    };
  }

  return {
    short: `高于理想区间上限 ${formatDecimal(speed - 60)} WPM`,
    long: `最近一次速度是 ${formatDecimal(speed)} WPM，已经高于理想区间上限 60 WPM ${formatDecimal(
      speed - 60
    )}。这个速度很亮眼，接下来更值得关注的是稳定性和准确率。`,
  };
}

function buildHistoryInsight(records) {
  const latest = getLatestHistoryResult();

  if (!latest) {
    return "完成一次练习后，这里会显示速度距离和鼓励语。";
  }

  const averageWpm = calculateAverage(records, "wpm");
  const averageAccuracy = calculateAverage(records, "accuracy");
  const latestDistance = getSpeedDistanceMessage(latest.wpm);
  const trend = getTrendMessage(records);
  const encouragement = getHistoryEncouragement(latest.wpm, averageAccuracy);

  return [
    latestDistance.long,
    `你的历史平均速度是 ${formatDecimal(averageWpm)} WPM，平均准确率是 ${formatDecimal(
      averageAccuracy
    )}%。${trend}`,
    encouragement,
  ].join("\n");
}

function getTrendMessage(records) {
  if (records.length < 2) {
    return "先继续积累几次练习，趋势会更明显。";
  }

  const latest = records[records.length - 1].wpm;
  const previous = records[records.length - 2].wpm;
  const delta = latest - previous;

  if (Math.abs(delta) < 0.5) {
    return "和上一次相比，速度很稳定，这种稳定性对机考很有帮助。";
  }

  if (delta > 0) {
    return `和上一次相比提升了 ${formatDecimal(delta)} WPM，能看出她在稳步进步。`;
  }

  return `和上一次相比下降了 ${formatDecimal(Math.abs(delta))} WPM，不过节奏会有波动，保持练习就会慢慢回升。`;
}

function getHistoryEncouragement(wpm, accuracy) {
  const speed = Number(wpm) || 0;
  const accuracyValue = Number(accuracy) || 0;

  if (speed >= 40 && speed <= 60 && accuracyValue >= 95) {
    return "这已经是很接近理想考试状态的一组成绩了，速度和准确率都很让人放心。";
  }

  if (speed >= 40 && speed <= 60) {
    return "速度已经到了理想区间，只要继续把准确率守住，就会越来越像正式机考的状态。";
  }

  if (speed < 40 && accuracyValue >= 95) {
    return "准确率已经很好了，说明基础很稳。接下来只要一点点提速，就会更接近雅思机试节奏。";
  }

  return "每完成一篇都会留下清晰的进步轨迹，慢慢练下去，速度和稳定性都会一起涨上来。";
}

function buildHistoryChartSvg(records) {
  const width = Math.max(720, records.length * 90);
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 40, left: 52 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(70, ...records.map((record) => Math.max(Number(record.wpm) || 0, 60)));
  const xStep = records.length > 1 ? innerWidth / (records.length - 1) : innerWidth / 2;
  const toY = (value) =>
    padding.top + innerHeight - (Math.max(0, value) / maxValue) * innerHeight;
  const points = records.map((record, index) => {
    const x = padding.left + (records.length > 1 ? index * xStep : innerWidth / 2);
    const y = toY(record.wpm);
    return { x, y, record, index };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const idealTop = toY(60);
  const idealBottom = toY(40);
  const yTicks = [];

  for (let tick = 0; tick <= Math.ceil(maxValue / 20) * 20; tick += 20) {
    yTicks.push(tick);
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="历史 WPM 折线图">
      <rect x="${padding.left}" y="${idealTop}" width="${innerWidth}" height="${idealBottom - idealTop}" fill="rgba(45, 155, 104, 0.12)" rx="12" />
      ${yTicks
        .map((tick) => {
          const y = toY(tick);
          return `
            <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="rgba(148, 137, 173, 0.2)" stroke-dasharray="4 6" />
            <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="12" fill="currentColor">${tick}</text>
          `;
        })
        .join("")}
      <polyline fill="none" stroke="#d86491" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${polyline}" />
      ${points
        .map(
          (point) => `
            <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="#ffffff" stroke="#d86491" stroke-width="3" />
            <text x="${point.x}" y="${height - 14}" text-anchor="middle" font-size="12" fill="currentColor">${point.index + 1}</text>
            <text x="${point.x}" y="${point.y - 12}" text-anchor="middle" font-size="12" fill="currentColor">${formatDecimal(
              point.record.wpm
            )}</text>
          `
        )
        .join("")}
      <text x="${padding.left}" y="${idealTop - 8}" font-size="12" fill="currentColor">理想区间 40-60 WPM</text>
    </svg>
  `;
}

function loadPreferences() {
  const rawValue = localStorage.getItem(STORAGE_KEYS.preferences);

  if (!rawValue) {
    syncPreferenceInputs();
    return;
  }

  try {
    const savedPreferences = JSON.parse(rawValue);
    state.preferences = {
      ...state.preferences,
      ...savedPreferences,
    };
  } catch (error) {
    console.warn("Failed to parse preferences:", error);
  }

  syncPreferenceInputs();
}

function savePreferences() {
  localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify(state.preferences));
}

function syncPreferenceInputs() {
  elements.hintToggle.checked = state.preferences.showHints;
  elements.compareToggle.checked = state.preferences.showComparison;
  elements.focusToggle.checked = state.preferences.autoFocus;
  elements.fontSizeRange.value = String(state.preferences.fontSize);
}

function applyPreferences() {
  document.body.dataset.theme = state.preferences.theme;
  document.body.classList.toggle("exam-mode", state.preferences.examMode);
  document.documentElement.style.setProperty("--font-size", `${state.preferences.fontSize}px`);
  elements.fontSizeValue.textContent = `${state.preferences.fontSize}px`;
  elements.hintPanel.hidden = !state.preferences.showHints;
  elements.themeButton.textContent =
    state.preferences.theme === "light" ? "切换深色模式" : "切换浅色模式";
  elements.examModeButton.textContent = state.preferences.examMode ? "退出考试模式" : "考试模式";
}

function createEmptyStats() {
  return {
    elapsedMs: 0,
    totalChars: 0,
    correctChars: 0,
    errorChars: 0,
    accuracy: 0,
    errorRate: 0,
    wpm: 0,
    cpm: 0,
  };
}

function formatElapsedTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDecimal(value) {
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}

function formatTaskType(type) {
  if (type === "task1") {
    return "Task 1";
  }

  if (type === "task2") {
    return "Task 2";
  }

  return "-";
}

function countWords(text) {
  if (!text) {
    return 0;
  }

  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getEmbeddedTexts() {
  if (!Array.isArray(window.__IELTS_SAMPLE_TEXTS__)) {
    return [];
  }

  return window.__IELTS_SAMPLE_TEXTS__;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
