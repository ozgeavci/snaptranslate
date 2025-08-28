const API = "http://localhost:8787";
const elList = document.getElementById("list");
const elStatus = document.getElementById("status");
const elRefresh = document.getElementById("btn-refresh");
const elSearch = document.getElementById("search");

let allItems = [];   // tüm kayıtlar (cache)
let filtered = [];   // arama filtresi

function setStatus(msg){ elStatus.textContent = msg || ""; }

function fmtDate(ts){
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

function escapeHtml(s=""){
  return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function render(list){
  elList.innerHTML = "";
  if (!list.length){
    elList.innerHTML = `<li style="opacity:.7;">Kayıt bulunamadı.</li>`;
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach((it, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="row">
        <div class="l">
          <div class="txt">${escapeHtml(it.text || "")}</div>
          <div class="trn">${escapeHtml(it.translation || "")}</div>
          <div class="meta">
            ${it.target_lang ? `Lang: ${it.target_lang} • ` : ""}${it.source_url ? `<span title="${escapeHtml(it.source_url)}">Kaynak</span> • `:""}${it.created_at || ""}
          </div>
        </div>
        <div>
          <button class="del" data-i="${idx}" title="Sil">Sil</button>
        </div>
      </div>
    `;
    frag.appendChild(li);
  });
  elList.appendChild(frag);

  // Sil butonları
  elList.querySelectorAll(".del").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const i = Number(e.currentTarget.dataset.i);
      const item = list[i];
      if (!item) return;
      try{
        setStatus("Siliniyor…");
        const res = await fetch(`${API}/vocab/delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,                 
            text: item.text,
            translation: item.translation,
            created_at: item.created_at
          })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await load(); // yeniden yükle
      }catch(err){
        console.error(err);
        setStatus("Silinemedi.");
      }
    });
  });
}

function applyFilter(){
  const q = (elSearch.value || "").toLowerCase().trim();
  if (!q){ filtered = allItems.slice(0, 500); return render(filtered); }
  filtered = allItems.filter(it =>
    String(it.text||"").toLowerCase().includes(q) ||
    String(it.translation||"").toLowerCase().includes(q)
  );
  render(filtered.slice(0, 500));
}

async function load(){
  try{
    setStatus("Yükleniyor…");
    const res = await fetch(`${API}/vocab`, { method: "GET" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    // En yeni üstte
    allItems = Array.isArray(data) ? data.sort((a,b) => (b.id||0)-(a.id||0)) : [];
    setStatus("");
    applyFilter();
  }catch(e){
    console.error(e);
    setStatus("Liste alınamadı. Backend açık mı?");
    elList.innerHTML = "";
  }
}

elRefresh.addEventListener("click", load);
elSearch.addEventListener("input", applyFilter);

// İlk yükleme
document.addEventListener("DOMContentLoaded", load);
