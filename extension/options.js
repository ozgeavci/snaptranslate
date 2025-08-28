
const backendUrl = document.getElementById("backendUrl");
const apiKey = document.getElementById("apiKey");
const targetLang = document.getElementById("targetLang");
const saved = document.getElementById("saved");

(async () => {
  const data = await chrome.storage.sync.get({
    backendUrl: "",
    apiKey: "",
    targetLang: "en",
  });
  backendUrl.value = data.backendUrl;
  apiKey.value = data.apiKey;
  targetLang.value = data.targetLang;
})();

document.getElementById("save").addEventListener("click", async () => {
  await chrome.storage.sync.set({
    backendUrl: backendUrl.value.trim(),
    apiKey: apiKey.value.trim(),
    targetLang: targetLang.value.trim() || "en",
  });
  saved.textContent = "Saved ✓";
});
