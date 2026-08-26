# HP-Translator Server & Browser Extension

Translates harsh code review comments into warm, encouraging messages — right inside GitHub PR reviews.

## Setup

### 1. Start the local server

```bash
pnpm run hp-translator
```

This starts a local proxy on `http://localhost:3033` that calls `claude -p` with the hp-translator skill.

### 2. Install Tampermonkey

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. If using **Edge** or **Chrome**, enable Developer Mode for extensions:
    - Go to `chrome://extensions` (or `edge://extensions`)
    - Toggle **Developer mode** ON (top right)
    - This is required for Tampermonkey to run userscripts on all pages
3. If your browser restricts Tampermonkey on certain sites:
    - Go to Tampermonkey extension settings
    - Ensure "Allow access to file URLs" is checked
    - Ensure it's not restricted on `github.com`

### 3. Install the userscript

1. Open Tampermonkey dashboard (click icon → Dashboard)
2. Click the **+** tab to create a new script
3. Delete the template content
4. Paste the contents of `hp-translator.user.js`
5. Press **Ctrl+S** to save
6. Tampermonkey may ask to allow connections to `localhost` — click **Allow**

### 4. Use it

1. Make sure the server is running (`pnpm run hp-translator`)
2. Open a GitHub PR and start a review comment
3. Write your comment (English, Hungarian, or mixed)
4. Click the **HP-Translator** button next to Cancel/Comment
5. The comment gets replaced with a softened version

## Debugging

### Script not loading

- Check Tampermonkey icon on a GitHub PR page — it should show "HP-Translator" in the dropdown
- If not listed, the `@match` pattern isn't matching. Verify Tampermonkey is enabled
- Open DevTools console (F12) and look for errors

### Button not appearing

Run this in the DevTools console to check if the markdown editors are found:

```js
document.querySelectorAll('[class*="MarkdownEditor-module__container"]').length;
```

If it returns `0`, GitHub may have changed their class names. Inspect the comment box and update the selector in the userscript.

### Cannot reach server

- Verify the server is running: `curl -X POST http://localhost:3033/hp-translator -H "Content-Type: application/json" -d "{\"text\":\"Ez szar\"}"`
- Check that Tampermonkey has `@grant GM_xmlhttpRequest` and `@connect localhost` — these bypass GitHub's CSP
- If Tampermonkey prompts about cross-origin requests to localhost, click Allow

### Enable Tampermonkey debug mode

1. Tampermonkey dashboard → Settings tab
2. Set **Config Mode** to **Advanced**
3. Under **General**, set **Debug scripts** to **Enabled**
4. This adds `debugger` statements you can catch in DevTools with breakpoints

## Architecture

```
GitHub PR page (Tampermonkey userscript)
  → GM_xmlhttpRequest to localhost:3033 (bypasses CSP)
    → Node.js server
      → claude -p with hp-translator skill (uses existing AWS Bedrock auth)
        → translated comment back to browser
```
