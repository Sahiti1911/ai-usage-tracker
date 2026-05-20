const statusElement = document.getElementById("status");
const promptsElement = document.getElementById("prompts");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveApiBaseUrlButton = document.getElementById("saveApiBaseUrl");

chrome.runtime.sendMessage({ type: "GET_RECENT_PROMPTS" }, (response) => {
  if (!response?.success) {
    statusElement.textContent = "Unable to read local prompt history.";
    return;
  }

  const prompts = response.prompts || [];
  apiBaseUrlInput.value = response.apiBaseUrl || "";
  statusElement.textContent = prompts.length
    ? `${prompts.length} recent captures stored locally.`
    : "Monitoring supported AI sites. No captures yet.";

  promptsElement.replaceChildren(...prompts.map(renderPrompt));
});

saveApiBaseUrlButton.addEventListener("click", () => {
  chrome.runtime.sendMessage(
    {
      type: "SET_API_BASE_URL",
      apiBaseUrl: apiBaseUrlInput.value
    },
    (response) => {
      if (!response?.success) {
        statusElement.textContent = "Could not save backend URL.";
        return;
      }

      apiBaseUrlInput.value = response.apiBaseUrl;
      statusElement.textContent = "Backend URL saved.";
    }
  );
});

function renderPrompt(prompt) {
  const item = document.createElement("article");
  item.className = "prompt";

  const meta = document.createElement("div");
  meta.className = "meta";

  const provider = document.createElement("span");
  provider.textContent = prompt.provider || prompt.website || "AI site";

  const time = document.createElement("span");
  time.textContent = formatTime(prompt.timestamp);

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = prompt.prompt;

  meta.append(provider, time);
  item.append(meta, text);
  return item;
}

function formatTime(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}
