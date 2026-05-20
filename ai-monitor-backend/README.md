# AI Prompt Monitor Backend

Local Express backend for the AI Prompt Monitor Chrome extension.

## Run

```bash
npm start
```

By default the server listens on `http://localhost:3000`.

## Deploy To Render

1. Push this `ai-monitor-backend` folder to GitHub.
2. In Render, create a new Web Service from the GitHub repo.
3. Use these settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the Azure OpenAI environment variables from `.env.example`.
5. After deploy, copy the Render URL, for example `https://ai-monitor-backend.onrender.com`.

The included `render.yaml` can also be used as a Render Blueprint.

## Endpoints

- `POST /log`: stores a prompt capture.
- `GET /logs`: returns recent captures as JSON.
- `GET /`: opens a simple dashboard.

Captures are kept in memory and appended to `data/prompt-logs.jsonl`.

## Azure OpenAI Analysis

Set these environment variables before starting the server to enrich each prompt with intent, category, risk, and sensitive-data flags:

```bash
cp .env.example .env
```

Then edit `.env` and add your Azure OpenAI values.

If these variables are missing, prompts are still stored and `analysisStatus` is set to `skipped`.

For the classic Azure OpenAI deployment chat completions endpoint, the default API version is `2024-10-21`.
