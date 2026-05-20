(() => {
  if (window.__aiPromptMonitorInstalled) return;
  window.__aiPromptMonitorInstalled = true;

  const providerByHost = {
    "chat.openai.com": "ChatGPT",
    "chatgpt.com": "ChatGPT",
    "claude.ai": "Claude",
    "gemini.google.com": "Gemini"
  };

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

  function findPrompt(value) {
    const seen = new WeakSet();
    const matches = [];

    function visit(node, path = "") {
      if (!node || matches.length > 20) return;

      if (typeof node === "string") {
        const text = normalizeText(node);
        if (text.length > 1 && !looksLikeMetadata(path, text)) {
          matches.push({ path, text });
        }
        return;
      }

      if (typeof node !== "object" || seen.has(node)) return;
      seen.add(node);

      if (Array.isArray(node)) {
        node.forEach((item, index) => visit(item, `${path}[${index}]`));
        return;
      }

      for (const [key, child] of Object.entries(node)) {
        const nextPath = path ? `${path}.${key}` : key;
        if (isPromptKey(key)) {
          const text = normalizeText(child);
          if (text) matches.push({ path: nextPath, text, score: 10 });
          continue;
        }
        visit(child, nextPath);
      }
    }

    visit(value);

    return matches
      .sort((a, b) => (b.score || scorePath(b.path)) - (a.score || scorePath(a.path)))
      .map((match) => match.text)
      .find(Boolean);
  }

  function isPromptKey(key) {
    return /^(prompt|query|text|message|content|input|parts)$/i.test(key);
  }

  function scorePath(path) {
    if (/message|content|prompt|parts|text/i.test(path)) return 5;
    return 1;
  }

  function looksLikeMetadata(path, text) {
    if (/token|id|uuid|model|timezone|locale|client|version|url/i.test(path)) return true;
    if (/^[a-z0-9_-]{20,}$/i.test(text)) return true;
    return text.length > 10000;
  }

  function parseBody(body) {
    if (!body) return null;
    if (typeof body === "string") {
      try {
        return JSON.parse(body);
      } catch {
        return body;
      }
    }
    return body;
  }

  function capture(url, body) {
    if (window.location.hostname === "gemini.google.com") {
      return;
    }

    const urlText = String(url || "");
    if (!/(conversation|message|completion|generate|stream|assistant|bard)/i.test(urlText)) {
      return;
    }

    const host = window.location.hostname;
    const geminiPrompt = host === "gemini.google.com" ? findGeminiPrompt(body) : "";
    if (host === "gemini.google.com" && !geminiPrompt) return;

    const parsed = parseBody(body);
    const prompt = geminiPrompt || findPrompt(parsed);
    if (!prompt) return;

    window.postMessage(
      {
        type: "AI_PROMPT_MONITOR_CAPTURE",
        payload: {
          prompt,
          provider: providerByHost[host] || host,
          model: parsed?.model || parsed?.model_slug || parsed?.modelName || "",
          requestUrl: urlText
        }
      },
      window.location.origin
    );
  }

  function findGeminiPrompt(body) {
    if (typeof body !== "string") return "";

    const form = parseUrlEncodedBody(body);
    const fReq = form.get("f.req");
    if (!fReq) return "";

    try {
      const parsed = JSON.parse(fReq);

      if (parsed?.[0] === null && typeof parsed?.[1] === "string") {
        return extractGeminiPromptPayload(parsed[1]);
      }

      return "";
    } catch {
      return "";
    }
  }

  function parseUrlEncodedBody(body) {
    try {
      return new URLSearchParams(body);
    } catch {
      return new URLSearchParams();
    }
  }

  function extractGeminiPromptPayload(payload) {
    try {
      const parsed = JSON.parse(payload);
      const prompt = parsed?.[0]?.[0];

      if (typeof prompt !== "string") return "";
      return looksLikeUserPrompt(prompt) ? prompt.trim() : "";
    } catch {
      return "";
    }
  }

  function looksLikeUserPrompt(text) {
    const trimmed = text.trim();
    if (trimmed.length < 1 || trimmed.length > 8000) return false;
    if (/^[A-Z0-9_-]{16,}$/.test(trimmed)) return false;
    if (/^[a-z_:.0-9-]+$/.test(trimmed) && !trimmed.includes(" ")) return false;
    return true;
  }

  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const [resource, init] = args;
    const url = typeof resource === "string" ? resource : resource?.url;
    capture(url, init?.body);
    return originalFetch.apply(this, args);
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__aiPromptMonitorUrl = url;
    return originalOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (body) {
    capture(this.__aiPromptMonitorUrl, body);
    return originalSend.call(this, body);
  };
})();
