const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "data", "prompt-logs.jsonl");

if (!fs.existsSync(logFile)) {
  console.log("No log file found.");
  process.exit(0);
}

const records = fs
  .readFileSync(logFile, "utf8")
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(Boolean)
  .filter(isUsefulPrompt);

const deduped = [];
for (const record of records) {
  const duplicateIndex = deduped.findIndex((existing) => isSameRecentPrompt(existing, record));
  if (duplicateIndex >= 0) deduped.splice(duplicateIndex, 1);
  deduped.push(record);
}

fs.writeFileSync(logFile, `${deduped.map((record) => JSON.stringify(record)).join("\n")}\n`, "utf8");

console.log(`Kept ${deduped.length} useful prompt records.`);

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
