(() => {
  const providerByHost = {
    "chat.openai.com": "ChatGPT",
    "chatgpt.com": "ChatGPT",
    "claude.ai": "Claude",
    "gemini.google.com": "Gemini"
  };

  const provider = providerByHost[window.location.hostname] || window.location.hostname;
  const recentPrompts = new Map();

  function sendCapture(capture) {
    const prompt = normalizeText(capture.prompt);

    if (!prompt) return;

    if (isDuplicatePrompt(prompt)) return;

    chrome.runtime.sendMessage({
      type: "PROMPT_CAPTURED",
      payload: {
        prompt,
        response: normalizeText(capture.response),
        provider,
        model: capture.model || provider,
        website: window.location.hostname,
        source: capture.source,
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    });
  }

  function isDuplicatePrompt(prompt) {
    const now = Date.now();
    const lastSeen = recentPrompts.get(prompt) || 0;

    for (const [text, timestamp] of recentPrompts.entries()) {
      if (now - timestamp > 10000) recentPrompts.delete(text);
    }

    if (now - lastSeen < 5000) return true;

    recentPrompts.set(prompt, now);
    return false;
  }

  function normalizeText(value) {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join("\n").trim();
    if (typeof value === "object") {
      if (typeof value.text === "string") return value.text.trim();
      if (typeof value.content === "string") return value.content.trim();
      if (Array.isArray(value.parts)) return normalizeText(value.parts);
      if (Array.isArray(value.content)) return normalizeText(value.content);
    }
    return "";
  }

  function getEditableText() {
    const candidates = [
      "textarea",
      "[contenteditable='true']",
      "[role='textbox']",
      "div.ProseMirror"
    ];

    for (const selector of candidates) {
      const element = document.querySelector(selector);
      const value = element?.value ?? element?.innerText ?? element?.textContent;
      const text = normalizeText(value);
      if (text) return text;
    }

    return "";
  }

  function installDomFallback() {
    document.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key !== "Enter" ||
          event.shiftKey ||
          event.ctrlKey ||
          event.altKey ||
          event.metaKey ||
          event.isComposing
        ) {
          return;
        }

        const prompt = getEditableText();
        captureAfterSubmit(prompt, "dom-submit");
      },
      true
    );

    document.addEventListener(
      "click",
      (event) => {
        const button = event.target.closest("button, [role='button']");
        if (!button) return;

        const label = [
          button.getAttribute("aria-label"),
          button.getAttribute("data-testid"),
          button.textContent
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!/(send|submit|arrow|paper-airplane)/.test(label)) return;

        const prompt = getEditableText();
        captureAfterSubmit(prompt, "dom-click");
      },
      true
    );
  }

  function captureAfterSubmit(prompt, source) {
    const submittedPrompt = normalizeText(prompt);
    if (!submittedPrompt) return;

    window.setTimeout(() => {
      const currentPrompt = getEditableText();

      if (currentPrompt === submittedPrompt) {
        return;
      }

      sendCapture({
        prompt: submittedPrompt,
        source: `${source}-after-send`
      });
    }, 700);
  }

  function injectPageInterceptor() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("injected.js");
    script.dataset.aiPromptMonitor = "true";
    (document.documentElement || document.head).appendChild(script);
    script.remove();
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.type !== "AI_PROMPT_MONITOR_CAPTURE") return;

    if (window.location.hostname === "gemini.google.com") {
      return;
    }

    sendCapture({ ...event.data.payload, source: "network" });
  });

  injectPageInterceptor();
  installDomFallback();
})();
