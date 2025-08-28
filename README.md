
# SnapTranslate (Chrome Extension + Lite Backend)

A lightweight Chrome Extension that instantly translates selected text, shows it in a small tooltip bubble, and allows you to save it to your personal vocabulary list via a local backend.

## Features
- Automatic translation bubble when selecting text on any webpage  
- “Save” button to add translations to a local JSON database  
- Popup window to view, search, and delete saved vocabulary, plus CSV export  
- Fully compatible with Chrome Manifest V3  

## Project Structure
```
backend-lite/       # Express.js mini backend (http://localhost:8787)
  └─ server.js
extension/          # Chrome Extension
  ├─ manifest.json
  ├─ content.js     # Injects translation bubble
  ├─ popup.html     # Vocabulary list UI
  ├─ popup.js
  ├─ background.js
  └─ icons/
```

---

## Backend Lite

This version does not require Visual Studio Build Tools on Windows.  
It stores vocabulary data in `vocab.json`.

### Run
```bash
cd backend-lite
npm i
npm start
```
- Server: `http://localhost:8787`  
- Vocabulary data is stored in `backend-lite/vocab.json`

### Environment variables (optional)
- `API_KEY` — requires Authorization: Bearer <API_KEY> header 
- `LT_URL` — LibreTranslate endpoint (default: https://libretranslate.de/translate)

### Endpoints
- `POST /translate` — `{ text, targetLang, sourceLangHint } → { translation }`  
- `POST /vocab` — `{ text, translation, targetLang, sourceUrl } → { id }`  
- `GET /vocab` — returns recent items

---

## Extension Setup

1. Open Chrome → `chrome://extensions`  
2. Enable **Developer Mode**  
3. Click **Load unpacked** and select the `extension/` folder  
4. The extension icon opens the popup (vocabulary list)  
5. Select any text on a page → translation bubble appears automatically  

---

## Usage
- **Translate** → Highlight any text, the bubble instantly shows translation  
- **Save** → Click “Save” in the bubble to store it in your vocabulary list  
- **Popup** → Click the extension icon to view/search/delete your saved items  
- **Export** → Use the CSV link in the popup to download your vocabulary  

---
