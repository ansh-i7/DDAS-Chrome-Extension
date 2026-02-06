document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggle");
  const storageSavedEl = document.getElementById("storageSaved");
  const viewBtn = document.getElementById("viewDuplicates");

  chrome.storage.local.get(
    ["enabled", "storageSaved", "duplicates"],
    (data) => {
      toggle.checked = data.enabled ?? true;
      storageSavedEl.textContent = formatSize(data.storageSaved || 0);
    }
  );

  toggle.addEventListener("change", () => {
    chrome.storage.local.set({ enabled: toggle.checked });
  });

  viewBtn.addEventListener("click", () => {
    chrome.storage.local.get("duplicates", (data) => {
      const list = data.duplicates || [];
      if (list.length === 0) {
        alert("No duplicate files detected yet.");
        return;
      }

      const text = list
        .map(d => `${d.name} (${formatSize(d.size)})`)
        .join("\n");

      alert("Duplicate files:\n\n" + text);
    });
  });
});

function formatSize(bytes) {
  if (!bytes) return "0 MB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}