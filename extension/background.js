// background.js (MV3 Service Worker) — Translate & Save (single-call)

// ====== CONFIG ======
const API = "http://localhost:8787";   // backend-lite
const TARGET_LANG = "tr";               // istersen popup/options'tan da ayarlanabilir

// ====== BADGE HELPERS ======
async function flashBadge(text = "", ms = 1500, color = "#0a7d32") {
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
  } catch (_) {}
}
const okBadge  = () => flashBadge("✓", 1200, "#0a7d32");
const errBadge = () => flashBadge("!", 1500, "#b00020");

// ====== CORE: TRANSLATE + SAVE ======
async function translateAndSave(text, sourceUrl = "") {
  if (!text || !text.trim()) {
    throw new Error("empty_text");
  }
  const body = {
    text,
    targetLang: TARGET_LANG,
    sourceLangHint: "auto",
    sourceUrl
  };

  const resp = await fetch(`${API}/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const raw = await resp.text().catch(() => "");
    throw new Error(`translate_failed_${resp.status}: ${raw}`);
  }

  const data = await resp.json();
  // /translate artık DB'ye yazıp { ok:true, item:{...} } döndürüyor
  if (!data?.item?.translation) {
    throw new Error("empty_translation_from_server");
  }
  return data.item;
}

// ====== CONTEXT MENU (Right-Click → Translate & Save) ======
const MENU_ID = "ta-translate-save";

chrome.runtime.onInstalled.addListener(() => {
  // Menü daha önce varsa temizleyip yeniden ekleyelim (idempotent)
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: "Translate & Save",
      contexts: ["selection"]
    });
  });
});

// Sağ tık menüsü tıklandığında
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;
  const selected = info.selectionText || "";
  const pageUrl  = tab?.url || "";

  try {
    const saved = await translateAndSave(selected, pageUrl);
    console.log("[TA] Saved:", saved);
    await okBadge();
  } catch (e) {
    console.error("[TA] Translate & Save error:", e);
    await errBadge();
  }
});

// ====== OPTIONAL: Message API (content/popup isteyebilir) ======
// content.js veya popup.js'ten çağırmak istersen:
// chrome.runtime.sendMessage({ type: "TA_TRANSLATE_AND_SAVE", text, sourceUrl })
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === "TA_TRANSLATE_AND_SAVE") {
        const saved = await translateAndSave(msg.text, msg.sourceUrl || "");
        await okBadge();
        sendResponse({ ok: true, saved });
      } else {
        sendResponse({ ok: false, error: "unknown_message" });
      }
    } catch (e) {
      console.error("[TA] msg error:", e);
      await errBadge();
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
  })();
  // async response
  return true;
});

// ====== TEST HOOK (DevTools console'da deneyebilirsin) ======
// translateAndSave("Merhaba dünya örnek", "chrome-extension://test")
