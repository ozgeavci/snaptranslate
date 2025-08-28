// content.js — Seçince otomatik çeviri + balonda sadece "Kaydet"
// Not: popup değil; sayfaya enjekte edilen balon UI.

const API = "http://localhost:8787";
const TARGET_LANG = "tr";

let bubble, textEl, transEl, saveBtn, statusEl;
let lastText = "", lastTranslation = "", lastUrl = "";

// ----- Race/Abort kontrol değişkenleri -----
let reqSeq = 0;           // her çeviri denemesinde artar
let currentCtrl = null;   // aktif fetch AbortController

// ---------------- UI ----------------
function ensureBubble() {
  if (bubble) return bubble;

  bubble = document.createElement("div");
  bubble.id = "__ta_bubble__";
  Object.assign(bubble.style, {
    position: "fixed",
    zIndex: "2147483647",
    maxWidth: "360px",
    background: "#111",
    color: "#fff",
    borderRadius: "12px",
    boxShadow: "0 10px 28px rgba(0,0,0,.35)",
    padding: "10px 12px",
    font: "13px system-ui, -apple-system, Segoe UI, Arial, sans-serif",
    display: "none",
    lineHeight: "1.45",
    pointerEvents: "none",               // seçimle çakışmasın
  });

  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gap = "6px";

  textEl = document.createElement("div");
  textEl.style.opacity = ".9";
  textEl.style.fontWeight = "600";

  transEl = document.createElement("div");
  transEl.style.opacity = ".95";

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.alignItems = "center";
  row.style.gap = "8px";

  statusEl = document.createElement("span");
  statusEl.style.fontWeight = "700";
  statusEl.style.minWidth = "18px";
  statusEl.style.textAlign = "center";

  saveBtn = document.createElement("button");
  saveBtn.textContent = "Kaydet";
  Object.assign(saveBtn.style, {
    cursor: "pointer",
    padding: "6px 10px",
    border: "0",
    borderRadius: "8px",
    background: "#00A67E",
    color: "#fff",
    fontWeight: "600",
    marginLeft: "auto",
    pointerEvents: "auto",               // buton tıklanabilir
  });

  row.appendChild(statusEl);
  row.appendChild(saveBtn);

  wrap.appendChild(textEl);
  wrap.appendChild(transEl);
  wrap.appendChild(row);

  const tip = document.createElement("div");
  Object.assign(tip.style, {
    position: "absolute",
    left: "16px",
    bottom: "-6px",
    width: "12px",
    height: "12px",
    background: "#111",
    transform: "rotate(45deg)",
    boxShadow: "3px 3px 12px rgba(0,0,0,.2)"
  });

  bubble.appendChild(wrap);
  bubble.appendChild(tip);
  document.documentElement.appendChild(bubble);

  // Dışarı hareketlerde gizle
  const hide = () => { bubble.style.display = "none"; };
  window.addEventListener("scroll", hide, true);
  window.addEventListener("resize", hide);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
  document.addEventListener("mousedown", (e) => { if (!bubble.contains(e.target)) hide(); });

  // Kaydet (yalnızca kayıt)
  saveBtn.addEventListener("click", async () => {
    if (!lastText || !lastTranslation) return;
    saveBtn.disabled = true;
    statusEl.textContent = "…";
    try {
      const res = await fetch(`${API}/vocab`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: lastText,
          translation: lastTranslation,
          targetLang: TARGET_LANG,
          sourceUrl: lastUrl || location.href
        })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      statusEl.textContent = "✓";
      setTimeout(() => (bubble.style.display = "none"), 900);
    } catch (e) {
      statusEl.textContent = "!";
      console.error("[TA] save error:", e);
    } finally {
      saveBtn.disabled = false;
    }
  });

  return bubble;
}

// -------------- API helpers --------------
// Tek denemelik istek (timeout'lu)
async function translateOnce(text, ctrl) {
  const to = setTimeout(() => ctrl.abort(), 4000); // 4 sn timeout
  try {
    const r = await fetch(`${API}/translate_only`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, targetLang: TARGET_LANG, sourceLangHint: "auto" }),
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    return data?.translation || "";
  } finally {
    clearTimeout(to);
  }
}

// Race/abort korumalı, tek retry'lı çeviri
async function safeTranslate(text) {
  // mevcut isteği iptal et
  if (currentCtrl) { try { currentCtrl.abort(); } catch {} }
  const myCtrl = new AbortController();
  currentCtrl = myCtrl;

  const mySeq = ++reqSeq;

  // ilk deneme
  try {
    const out1 = await translateOnce(text, myCtrl);
    if (mySeq !== reqSeq) return null; // bu arada yeni istek gelmiş → geçersiz
    return out1;
  } catch (_) {
    // kısa bekle, bir kez daha dene
    await new Promise(r => setTimeout(r, 700));
    const out2 = await translateOnce(text, myCtrl);
    if (mySeq !== reqSeq) return null;
    return out2;
  }
}

// -------------- Selection flow --------------
async function showForSelection() {
  const sel = window.getSelection?.();
  if (!sel || sel.isCollapsed) { if (bubble) bubble.style.display = "none"; return; }

  const text = String(sel.toString()).trim();
  if (!text) { if (bubble) bubble.style.display = "none"; return; }

  lastText = text;
  lastUrl = location.href;

  // DOM’a müdahale seçimden sonra yapılıyor (mouseup’tan çağrılacak)
  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  const b = ensureBubble();
  statusEl.textContent = "";
  textEl.textContent = text.length > 80 ? text.slice(0, 80) + "…" : text;
  transEl.textContent = "Çevriliyor…";

  // Seçimin biraz üstüne yerleştir
  const top = Math.max(8, rect.top + window.scrollY - 60);
  const left = Math.max(8, rect.left + window.scrollX);
  b.style.top = `${top}px`;
  b.style.left = `${left}px`;
  b.style.display = "block";

  try {
    const out = await safeTranslate(text);
    if (out == null) return; // bu cevap eski → yazma
    lastTranslation = out;
    transEl.textContent = lastTranslation || "(çeviri yok)";
  } catch (e) {
    transEl.textContent = "Çevrilemedi.";
    console.error("[TA] translate error:", e);
  }
}

// Seçim işlemi bittiğinde tetikle → seçim bozulmasın
document.addEventListener("mouseup", () => {
  setTimeout(showForSelection, 60);
});

// Klavye ile seçim için de destek (Shift ile seçimi bıraktığında)
document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") {
    setTimeout(showForSelection, 60);
  }
});

// -------------- SPA/DOM değişimi durumunda balonu kapat --------------
function invalidateUI() {
  if (bubble) bubble.style.display = "none";
  reqSeq++; // tüm eski yanıtları geçersiz kıl
  if (currentCtrl) { try { currentCtrl.abort(); } catch {} }
}

// History API patch (SPA route değişimi)
(function patchHistory(){
  const { pushState, replaceState } = history;
  history.pushState = function() { const r = pushState.apply(this, arguments); invalidateUI(); return r; };
  history.replaceState = function() { const r = replaceState.apply(this, arguments); invalidateUI(); return r; };
  window.addEventListener("popstate", invalidateUI);
})();

// Büyük DOM değişimlerinde de kapat (hafifçe)
const _mo = new MutationObserver(() => { invalidateUI(); });
_mo.observe(document.documentElement, { childList: true, subtree: true });
