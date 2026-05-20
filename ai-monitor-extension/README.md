# AI Prompt Monitor Extension

Chrome/Chromium MV3 extension that monitors supported AI web apps and forwards prompt captures to a local backend.

## Supported Sites

- ChatGPT: `chatgpt.com`, `chat.openai.com`
- Claude: `claude.ai`
- Gemini: `gemini.google.com`

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `C:\projects\ai-monitor-extension`.

## Local Backend

Start the backend from `C:\projects\ai-monitor-backend`:

```bash
npm start
```

The extension posts captures to the backend URL configured in the popup. By default it uses `https://ai-usage-tracker-meeu.onrender.com`.

For Render testing:

1. Deploy the backend.
2. Copy the Render URL, for example `https://ai-monitor-backend.onrender.com`.
3. Open the extension popup.
4. Paste the URL into Backend API URL and click Save.

## Notes

The extension uses both DOM submit detection and a page-context `fetch`/XHR interceptor. Modern AI sites change often, so the DOM fallback may need selector updates over time.

## Chrome Web Store Package

Zip the contents of this folder, not the parent folder. The zip should contain `manifest.json` at the top level.
