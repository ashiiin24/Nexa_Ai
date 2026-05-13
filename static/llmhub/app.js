const form = document.querySelector("#askForm");
const providerSelect = document.querySelector("#provider");
const modelSelect = document.querySelector("#model");
const questionInput = document.querySelector("#question");
const chatTranscript = document.querySelector("#chatTranscript");
const statusText = document.querySelector("#status");
const answerPanel = document.querySelector("#answerPanel");
const welcomeTitle = document.querySelector("#welcomeTitle");
const openSearch = document.querySelector("#openSearch");
const closeSearch = document.querySelector("#closeSearch");
const searchModal = document.querySelector("#searchModal");
const shareModal = document.querySelector("#shareModal");
const closeShare = document.querySelector("#closeShare");
const sharePreview = document.querySelector("#sharePreview");
const historySearch = document.querySelector("#historySearch");
const historyResults = document.querySelector("#historyResults");
const openAddMenu = document.querySelector("#openAddMenu");
const addMenu = document.querySelector("#addMenu");
const fileUpload = document.querySelector("#fileUpload");
const llmQuickSelect = document.querySelector("#llmQuickSelect");
const closeSidebar = document.querySelector("#closeSidebar");
const openSidebar = document.querySelector("#openSidebar");
const mobileOpenSidebar = document.querySelector("#mobileOpenSidebar");
const miniSearch = document.querySelector("#miniSearch");
let activeShareText = "";

function csrfToken() {
  return document.querySelector("[name=csrfmiddlewaretoken]").value;
}

function browserOffline() {
  return !navigator.onLine;
}

function syncModel() {
  const provider = browserOffline() ? "ollama" : providerSelect.value;
  let visibleOption = null;

  [...modelSelect.options].forEach((option) => {
    const matchesProvider = option.dataset.provider === provider;
    option.hidden = !matchesProvider;
    option.disabled = !matchesProvider;
    if (matchesProvider && !visibleOption) {
      visibleOption = option;
    }
  });

  if (visibleOption && modelSelect.selectedOptions[0]?.dataset.provider !== provider) {
    modelSelect.value = visibleOption.value;
  }
}

function syncConnectivity() {
  if (browserOffline()) {
    providerSelect.value = "ollama";
    providerSelect.disabled = true;
    llmQuickSelect.value = "ollama";
    llmQuickSelect.disabled = true;
    statusText.textContent = "Browser offline: Ollama mode";
  } else {
    providerSelect.disabled = false;
    llmQuickSelect.disabled = false;
    if (statusText.textContent === "Browser offline: Ollama mode") {
      statusText.textContent = "Ready";
    }
  }
  syncModel();
}

function setChatVisible() {
  answerPanel?.classList.add("visible");
  welcomeTitle?.classList.add("hidden");
}

function createAssistantActions() {
  const actions = document.createElement("div");
  actions.className = "message-actions";
  const items = [
    ["copy", "copy", "Copy"],
    ["like", "thumb-up", "Like"],
    ["dislike", "thumb-down", "Dislike"],
    ["share", "share", "Share"],
    ["regen", "regen", "Regenerate"],
    ["more", "more", "More"],
  ];
  items.forEach(([action, icon, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.innerHTML = actionIcon(icon);
    actions.append(button);
  });
  return actions;
}

function actionIcon(name) {
  const icons = {
    copy: '<svg viewBox="0 0 24 24"><path d="M8 8h10v12H8z"/><path d="M6 16H4V4h12v2"/></svg>',
    "thumb-up": '<svg viewBox="0 0 24 24"><path d="M7 10v10H4V10z"/><path d="M7 10l5-6 1 1v5h5c1 0 2 1 2 2l-2 6c-.3 1-1 2-2 2H7"/></svg>',
    "thumb-down": '<svg viewBox="0 0 24 24"><path d="M7 14V4H4v10z"/><path d="M7 14l5 6 1-1v-5h5c1 0 2-1 2-2l-2-6c-.3-1-1-2-2-2H7"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 19V5"/><path d="M7 10l5-5 5 5"/><path d="M5 19h14"/></svg>',
    regen: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></svg>',
    more: '<svg viewBox="0 0 24 24"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>',
  };
  return icons[name] || "";
}

function appendMessage(role, text, pending = false) {
  setChatVisible();
  const row = document.createElement("article");
  row.className = `chat-message ${role}`;
  if (pending) {
    row.classList.add("pending");
  }

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;
  row.append(bubble);

  if (role === "assistant") {
    row.append(createAssistantActions());
  }

  chatTranscript.append(row);
  row.scrollIntoView({ block: "end", behavior: "smooth" });
  return row;
}

async function copyText(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function getMessageText(button) {
  return button.closest(".chat-message")?.querySelector(".message-bubble")?.textContent || "";
}

function markReaction(button) {
  const actions = button.closest(".message-actions");
  actions?.querySelectorAll('[data-action="like"], [data-action="dislike"]').forEach((item) => {
    item.classList.toggle("active", item === button);
  });
}

function updateAssistantMessage(row, text) {
  row.classList.remove("pending");
  row.querySelector(".message-bubble").textContent = text || "No answer returned.";
}

function showAnswer(answer, meta, question = "") {
  setChatVisible();
  chatTranscript.innerHTML = "";
  if (question) {
    appendMessage("user", question);
  }
  appendMessage("assistant", answer || "No answer saved for this chat.");
  statusText.textContent = meta || "Saved chat";
}

function toggleSearch(open) {
  searchModal.hidden = !open;
  if (open) {
    historySearch.value = "";
    filterHistory("");
    historySearch.focus();
  }
}

function toggleShare(open, text = "") {
  activeShareText = text || activeShareText;
  if (sharePreview) {
    sharePreview.textContent = activeShareText;
  }
  shareModal.hidden = !open;
}

function shareUrlFor(target) {
  const url = encodeURIComponent(window.location.href);
  const text = encodeURIComponent(activeShareText);

  if (target === "x") {
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }
  if (target === "linkedin") {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  }
  if (target === "reddit") {
    return `https://www.reddit.com/submit?url=${url}&title=${text}`;
  }
  if (target === "whatsapp") {
    return `https://wa.me/?text=${text}%20${url}`;
  }

  return window.location.href;
}

function filterHistory(query) {
  const normalized = query.trim().toLowerCase();
  historyResults?.querySelectorAll(".history-result").forEach((item) => {
    const haystack = `${item.dataset.question || ""} ${item.dataset.answer || ""}`.toLowerCase();
    item.hidden = Boolean(normalized) && !haystack.includes(normalized);
  });
}

function toggleAddMenu(open) {
  addMenu.hidden = !open;
}

function setPromptMode(text) {
  questionInput.value = text;
  questionInput.focus();
  questionInput.setSelectionRange(questionInput.value.length, questionInput.value.length);
  questionInput.dispatchEvent(new Event("input"));
}

function setQuestionType(type) {
  const questionType = document.querySelector("#questionType");
  if (questionType) {
    questionType.value = type;
  }
  statusText.textContent = `${type.charAt(0).toUpperCase()}${type.slice(1)} mode`;
}

function syncQuickLlm() {
  if (llmQuickSelect && llmQuickSelect.value !== providerSelect.value) {
    llmQuickSelect.value = providerSelect.value;
  }
}

function chooseQuickLlm() {
  const option = llmQuickSelect.selectedOptions[0];
  if (!llmQuickSelect.value) {
    statusText.textContent = "Choose LLM";
    return;
  }
  if (llmQuickSelect.value !== "groq") {
    llmQuickSelect.value = "";
    statusText.textContent = "Only Groq is active";
    return;
  }
  providerSelect.value = llmQuickSelect.value;
  modelSelect.value = option?.dataset.model || "";
  syncConnectivity();
  statusText.textContent = option?.dataset.configured === "false" ? "API key missing" : option?.textContent.trim() || "Ready";
}

function setSidebarCollapsed(collapsed) {
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  localStorage.setItem("sidebarCollapsed", collapsed ? "true" : "false");
}

function setMobileSidebar(open) {
  document.body.classList.toggle("mobile-sidebar-open", open);
}

providerSelect.addEventListener("change", () => {
  syncModel();
  syncQuickLlm();
});
llmQuickSelect?.addEventListener("change", chooseQuickLlm);
window.addEventListener("online", syncConnectivity);
window.addEventListener("offline", syncConnectivity);
syncConnectivity();
setSidebarCollapsed(localStorage.getItem("sidebarCollapsed") === "true");

questionInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = form.querySelector('button[type="submit"]');
  const question = questionInput.value.trim();

  if (!question) {
    questionInput.focus();
    return;
  }

  const offlineMode = browserOffline();
  if (!offlineMode && !llmQuickSelect.value) {
    showAnswer("Choose an LLM before sending.", "Choose LLM");
    statusText.textContent = "Choose LLM";
    llmQuickSelect.focus();
    return;
  }
  if (!offlineMode && llmQuickSelect.value !== "groq") {
    showAnswer("Only Groq is active right now.", "Choose LLM");
    llmQuickSelect.value = "";
    llmQuickSelect.focus();
    return;
  }

  syncConnectivity();
  submitButton.disabled = true;
  statusText.textContent = "Thinking...";
  appendMessage("user", question);
  const pendingMessage = appendMessage("assistant", "Thinking...", true);
  questionInput.value = "";
  questionInput.style.height = "auto";

  const payload = {
    question,
    question_type: document.querySelector("#questionType").value,
    provider: offlineMode ? "ollama" : llmQuickSelect.value,
    model: modelSelect.value,
    offline_mode: offlineMode,
  };

  const providerOption = providerSelect.selectedOptions[0];
  if (!offlineMode && providerOption?.dataset.configured === "false") {
    updateAssistantMessage(pendingMessage, "API key missing for this provider. Add the correct key in .env and restart the Django server, or use Ollama when offline.");
    statusText.textContent = "Missing API key";
    submitButton.disabled = false;
    return;
  }

  try {
    const response = await fetch("/api/ask/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken(),
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Request failed");
    }
    updateAssistantMessage(pendingMessage, data.answer);
    statusText.textContent = `${data.provider} / ${data.model}`;
    addChatHistoryItem(question, data.answer, `${data.provider} / ${data.model}`);
  } catch (error) {
    updateAssistantMessage(pendingMessage, error.message);
    statusText.textContent = "Error";
  } finally {
    submitButton.disabled = false;
  }
});

questionInput?.addEventListener("input", (event) => {
  event.target.style.height = "auto";
  event.target.style.height = `${event.target.scrollHeight}px`;
});

document.querySelectorAll(".recent-chat, .history-result").forEach((item) => {
  item.addEventListener("click", () => {
    showAnswer(item.dataset.answer, item.dataset.meta, item.dataset.question);
    toggleSearch(false);
  });
});

function truncateText(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function bindHistoryButton(button) {
  button.addEventListener("click", () => {
    showAnswer(button.dataset.answer, button.dataset.meta, button.dataset.question);
    toggleSearch(false);
  });
}

function addChatHistoryItem(question, answer, meta) {
  const recents = document.querySelector(".recents");
  const emptyRecent = recents?.querySelector("p");
  emptyRecent?.remove();

  const recentButton = document.createElement("button");
  recentButton.className = "recent-chat";
  recentButton.type = "button";
  recentButton.title = question;
  recentButton.dataset.question = question;
  recentButton.dataset.answer = answer;
  recentButton.dataset.meta = meta;
  recentButton.textContent = truncateText(question, 34);
  bindHistoryButton(recentButton);
  recents?.insertBefore(recentButton, recents.querySelector("h2")?.nextSibling || null);

  const emptySearch = historyResults?.querySelector(".empty-history");
  emptySearch?.remove();
  const historyButton = document.createElement("button");
  historyButton.className = "history-result";
  historyButton.type = "button";
  historyButton.dataset.question = question;
  historyButton.dataset.answer = answer;
  historyButton.dataset.meta = meta;

  const title = document.createElement("strong");
  title.textContent = truncateText(question, 80);
  const date = document.createElement("span");
  date.textContent = new Date().toLocaleString();
  historyButton.append(title, date);
  bindHistoryButton(historyButton);
  historyResults?.prepend(historyButton);
}

openSearch?.addEventListener("click", () => toggleSearch(true));
miniSearch?.addEventListener("click", () => toggleSearch(true));
closeSearch?.addEventListener("click", () => toggleSearch(false));
closeSidebar?.addEventListener("click", () => setSidebarCollapsed(true));
openSidebar?.addEventListener("click", () => setSidebarCollapsed(false));
mobileOpenSidebar?.addEventListener("click", () => setMobileSidebar(true));
closeSidebar?.addEventListener("click", () => setMobileSidebar(false));
closeShare?.addEventListener("click", () => toggleShare(false));
shareModal?.addEventListener("click", (event) => {
  if (event.target === shareModal) {
    toggleShare(false);
  }
});
shareModal?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-share]");
  if (!button) {
    return;
  }

  const target = button.dataset.share;
  if (target === "copy") {
    await copyText(window.location.href);
    statusText.textContent = "Link copied";
    return;
  }

  window.open(shareUrlFor(target), "_blank", "noopener,noreferrer");
});
chatTranscript?.addEventListener("click", async (event) => {
  const button = event.target.closest(".message-actions button");
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const text = getMessageText(button);

  if (action === "copy") {
    await copyText(text);
    statusText.textContent = "Copied";
  } else if (action === "like" || action === "dislike") {
    markReaction(button);
    statusText.textContent = action === "like" ? "Liked" : "Disliked";
  } else if (action === "share") {
    toggleShare(true, text);
  } else if (action === "regen") {
    const userMessage = button.closest(".chat-message")?.previousElementSibling;
    const prompt = userMessage?.classList.contains("user") ? userMessage.querySelector(".message-bubble")?.textContent : "";
    if (prompt) {
      questionInput.value = prompt;
      form.requestSubmit();
    }
  } else if (action === "more") {
    statusText.textContent = "More options coming soon";
  }
});
searchModal?.addEventListener("click", (event) => {
  if (event.target === searchModal) {
    toggleSearch(false);
  }
});
historySearch?.addEventListener("input", (event) => filterHistory(event.target.value));
openAddMenu?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleAddMenu(addMenu.hidden);
});
addMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action], button[data-question-type]");
  if (!button) {
    return;
  }

  if (button.dataset.questionType) {
    setQuestionType(button.dataset.questionType);
    toggleAddMenu(false);
    questionInput.focus();
    return;
  }

  const action = button.dataset.action;
  toggleAddMenu(false);

  if (action === "upload-file") {
    fileUpload.click();
  } else if (action === "create-image") {
    setPromptMode("Create an image of ");
  } else if (action === "deep-research") {
    setPromptMode("Deep research: ");
  } else if (action === "recent-file") {
    statusText.textContent = "Recent files";
    showAnswer("Recent file list is not connected yet.", "Recent files");
  }
});
fileUpload?.addEventListener("change", () => {
  const names = [...fileUpload.files].map((file) => file.name).join(", ");
  if (names) {
    statusText.textContent = "Files selected";
    showAnswer(names, "Files selected");
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !searchModal?.hidden) {
    toggleSearch(false);
  }
  if (event.key === "Escape" && !shareModal?.hidden) {
    toggleShare(false);
  }
  if (event.key === "Escape" && !addMenu?.hidden) {
    toggleAddMenu(false);
  }
  if (event.key === "Escape" && document.body.classList.contains("mobile-sidebar-open")) {
    setMobileSidebar(false);
  }
});
document.addEventListener("click", (event) => {
  if (!addMenu?.hidden && !event.target.closest(".plus-menu-wrap")) {
    toggleAddMenu(false);
  }
});
