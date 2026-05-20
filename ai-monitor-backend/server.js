require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = Number(process.env.PORT || 3000);
const dataDir = path.join(__dirname, "data");
const logFile = path.join(dataDir, "prompt-logs.jsonl");
const logs = [];
const azureConfig = {
  endpoint: trimTrailingSlash(process.env.AZURE_OPENAI_ENDPOINT || ""),
  apiKey: process.env.AZURE_OPENAI_API_KEY || "",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || process.env.AZURE_DEPLOYMENT_NAME || "",
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-02-15-preview"
};

fs.mkdirSync(dataDir, { recursive: true });
loadExistingLogs();

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

app.post("/log", async (req, res) => {
  const record = normalizeRecord(req.body);

  if (!isUsefulPrompt(record)) {
    res.status(202).json({ success: true, ignored: true });
    return;
  }

  const enrichedRecord = await enrichRecord(record);

  removeRecentDuplicate(record);
  logs.push(enrichedRecord);
  fs.appendFileSync(logFile, `${JSON.stringify(enrichedRecord)}\n`, "utf8");

  console.log(`[${enrichedRecord.timestamp}] ${enrichedRecord.provider} ${enrichedRecord.model || ""}`);
  console.log(enrichedRecord.prompt);
  if (enrichedRecord.intent || enrichedRecord.category || enrichedRecord.risk) {
    console.log(`analysis: ${enrichedRecord.intent || "-"} | ${enrichedRecord.category || "-"} | ${enrichedRecord.risk || "-"}`);
  }
  console.log("");

  res.status(201).json({ success: true, id: enrichedRecord.id, analysisStatus: enrichedRecord.analysisStatus });
});

app.get("/logs", (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  res.json({
    success: true,
    count: logs.length,
    logs: logs.slice(-limit).reverse()
  });
});

app.get("/", (req, res) => {
  res.type("html").send(renderDashboard());
});

app.listen(port, () => {
  console.log(`AI Monitor backend running at http://localhost:${port}`);
  console.log(`Writing logs to ${logFile}`);
});

function normalizeRecord(body) {
  return {
    id: body.id || cryptoRandomId(),
    prompt: String(body.prompt || "").trim(),
    response: body.response ? String(body.response).trim() : "",
    provider: body.provider || providerFromHost(body.website),
    model: body.model || "",
    website: body.website || "",
    source: body.source || "unknown",
    title: body.title || "",
    url: body.url || "",
    timestamp: body.timestamp || new Date().toISOString()
  };
}

async function enrichRecord(record) {
  if (!shouldAnalyzePrompt(record.prompt)) {
    return { ...record, analysisStatus: "skipped" };
  }

  try {
    const analysis = await analyzePrompt(record.prompt);
    return {
      ...record,
      intent: analysis.intent || "unknown",
      category: analysis.category || "unknown",
      risk: analysis.risk || "unknown",
      containsSensitiveData: Boolean(analysis.contains_sensitive_data),
      containsCredentials: Boolean(analysis.contains_credentials),
      analysisStatus: "complete",
      analyzedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Azure analysis failed: ${error.message}`);
    return {
      ...record,
      analysisStatus: "failed",
      analysisError: error.message
    };
  }
}

function shouldAnalyzePrompt(prompt) {
  return azureConfig.endpoint && azureConfig.apiKey && azureConfig.deployment && String(prompt || "").trim().length >= 5;
}

async function analyzePrompt(prompt) {
  const response = await fetch(azureChatCompletionsUrl(), {
    method: "POST",
    headers: {
      "api-key": azureConfig.apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: [
            "You are an AI security and intent classifier.",
            "Classify the user's prompt for enterprise AI observability.",
            "Return ONLY valid JSON with these keys:",
            "{\"intent\":\"\",\"category\":\"\",\"risk\":\"low|medium|high\",\"contains_sensitive_data\":false,\"contains_credentials\":false}"
          ].join("\n")
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure OpenAI returned ${response.status}: ${errorText.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Azure OpenAI response did not include message content");
  }

  return parseJsonObject(content);
}

function azureChatCompletionsUrl() {
  return `${azureConfig.endpoint}/openai/deployments/${encodeURIComponent(azureConfig.deployment)}/chat/completions?api-version=${encodeURIComponent(azureConfig.apiVersion)}`;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Azure OpenAI response was not valid JSON");
    return JSON.parse(match[0]);
  }
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

function removeRecentDuplicate(record) {
  const recordTime = new Date(record.timestamp || 0).getTime();

  for (let index = logs.length - 1; index >= 0; index -= 1) {
    const existing = logs[index];
    const existingTime = new Date(existing.timestamp || 0).getTime();

    if (recordTime - existingTime > 10000) break;

    if (
      existing.prompt === record.prompt &&
      (existing.provider || existing.website) === (record.provider || record.website)
    ) {
      logs.splice(index, 1);
    }
  }
}

function providerFromHost(host = "") {
  if (host.includes("chatgpt") || host.includes("openai")) return "ChatGPT";
  if (host.includes("claude")) return "Claude";
  if (host.includes("gemini")) return "Gemini";
  return host || "Unknown";
}

function cryptoRandomId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadExistingLogs() {
  if (!fs.existsSync(logFile)) return;

  const lines = fs.readFileSync(logFile, "utf8").split(/\r?\n/).filter(Boolean);
  for (const line of lines.slice(-1000)) {
    try {
      const record = JSON.parse(line);
      if (isUsefulPrompt(record)) logs.push(record);
    } catch {
      // Ignore malformed lines so one bad write does not block startup.
    }
  }
}

function renderDashboard() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AI Prompt Monitor</title>
  <style>
    body { margin: 0; font-family: Arial, sans-serif; color: #172033; background: #f6f8fb; }
    header { padding: 24px clamp(16px, 4vw, 48px); background: #111827; color: white; }
    h1 { margin: 0; font-size: 26px; }
    main { padding: 24px clamp(16px, 4vw, 48px); }
    .toolbar { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 16px; color: #516070; }
    button { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; background: white; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; }
    th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { font-size: 12px; color: #475569; background: #f8fafc; }
    td { font-size: 14px; }
    .prompt { max-width: 720px; white-space: pre-wrap; }
    .muted { color: #64748b; }
  </style>
</head>
<body>
  <header><h1>AI Prompt Monitor</h1></header>
  <main>
    <div class="toolbar">
      <span id="status">Loading captures...</span>
      <button id="refresh">Refresh</button>
    </div>
    <table>
      <thead>
        <tr><th>Time</th><th>Provider</th><th>Intent</th><th>Category</th><th>Risk</th><th>Prompt</th></tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </main>
  <script>
    const rows = document.getElementById("rows");
    const status = document.getElementById("status");
    document.getElementById("refresh").addEventListener("click", loadLogs);
    loadLogs();
    async function loadLogs() {
      const response = await fetch("/logs?limit=100");
      const data = await response.json();
      status.textContent = data.count + " total captures";
      rows.replaceChildren(...data.logs.map(renderRow));
    }
    function renderRow(log) {
      const tr = document.createElement("tr");
      tr.append(cell(new Date(log.timestamp).toLocaleString()));
      tr.append(cell(log.provider || log.website || "Unknown"));
      tr.append(cell(log.intent || log.analysisStatus || ""));
      tr.append(cell(log.category || ""));
      tr.append(cell(log.risk || ""));
      const prompt = cell(log.prompt || "");
      prompt.className = "prompt";
      tr.append(prompt);
      return tr;
    }
    function cell(value) {
      const td = document.createElement("td");
      td.textContent = value;
      return td;
    }
  </script>
</body>
</html>`;
}
