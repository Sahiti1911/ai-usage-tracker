const DEFAULT_API_BASE_URL = "http://localhost:3000";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PROMPT_CAPTURED") {
    savePrompt(message.payload, sender)
      .then((result) => sendResponse(result))
      .catch((error) => sendResponse({ success: false, error: error.message }));

    return true;
  }

  if (message.type === "GET_RECENT_PROMPTS") {
    chrome.storage.local.get({ prompts: [], apiBaseUrl: DEFAULT_API_BASE_URL }, ({ prompts, apiBaseUrl }) => {
      sendResponse({ success: true, prompts: prompts.slice(-25).reverse(), apiBaseUrl });
    });
    return true;
  }

  if (message.type === "SET_API_BASE_URL") {
    const apiBaseUrl = normalizeApiBaseUrl(message.apiBaseUrl);
    chrome.storage.local.set({ apiBaseUrl }, () => {
      sendResponse({ success: true, apiBaseUrl });
    });
    return true;
  }
});

async function savePrompt(payload, sender) {
  const record = {
    id: crypto.randomUUID(),
    tabId: sender.tab?.id,
    title: sender.tab?.title,
    ...payload
  };

  if (!isUsefulPrompt(record)) {
    return { success: true, ignored: true };
  }

  await appendLocalRecord(record);

  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    throw new Error(`Backend returned ${response.status}`);
  }

  return { success: true };
}

async function getApiBaseUrl() {
  const { apiBaseUrl } = await chrome.storage.local.get({ apiBaseUrl: DEFAULT_API_BASE_URL });
  return normalizeApiBaseUrl(apiBaseUrl);
}

function normalizeApiBaseUrl(value) {
  const fallback = DEFAULT_API_BASE_URL;
  const normalized = String(value || fallback).trim().replace(/\/+$/, "");
  return normalized || fallback;
}

async function appendLocalRecord(record) {
  const { prompts } = await chrome.storage.local.get({ prompts: [] });
  const filteredPrompts = prompts.filter(isUsefulPrompt);
  const withoutDuplicate = filteredPrompts.filter((prompt) => !isSameRecentPrompt(prompt, record));
  const nextPrompts = [...withoutDuplicate, record].slice(-200);
  await chrome.storage.local.set({ prompts: nextPrompts });
}

function isUsefulPrompt(record) {
  const prompt = String(record.prompt || "").trim();

  if (!prompt) return false;
  if (prompt.startsWith("f.req=")) return false;
  if (/^at=/.test(prompt)) return false;
  if (/^[A-Za-z0-9_-]{16,}$/.test(prompt)) return false;
  if (/^(bard_activity_enabled|side_nav_open_by_default|current_popup_id|popup_zs_visits_cooldown)$/i.test(prompt)) {
    return false;
  }

  return true;
}

function isSameRecentPrompt(existing, record) {
  if (existing.prompt !== record.prompt) return false;
  if ((existing.provider || existing.website) !== (record.provider || record.website)) return false;

  const existingTime = new Date(existing.timestamp || 0).getTime();
  const recordTime = new Date(record.timestamp || 0).getTime();
  return Math.abs(recordTime - existingTime) < 10000;
}
