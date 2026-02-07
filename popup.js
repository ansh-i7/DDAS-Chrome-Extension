document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('list');
  const dupCountLabel = document.getElementById('dup-count');
  const savedMemLabel = document.getElementById('saved-mem');

  function render() {
    chrome.storage.local.get({ logs: [] }, (data) => {
      list.innerHTML = '';
      
      let duplicates = 0;
      let savedBytes = 0;

      if (data.logs.length === 0) {
        list.innerHTML = '<div class="empty">No recent activity</div>';
        dupCountLabel.innerText = "0";
        savedMemLabel.innerText = "0 B";
        return;
      }

      data.logs.forEach(log => {
        // --- 🛡️ BULLETPROOF STATS LOGIC ---
        // Count as duplicate if type is "duplicate" OR if the status text contains "Duplicate"
        if (log.type === "duplicate" || (log.status && log.status.includes("Duplicate"))) {
          duplicates++;
        }

        if (log.type === "cancelled") {
          // Use rawSize if available (accurate), otherwise parse the string (fallback)
          const bytes = (log.rawSize !== undefined) ? log.rawSize : parseSize(log.size);
          savedBytes += bytes;
        }

        const div = document.createElement('div');
        let cssClass = 'safe';
        let actionsHtml = '';

        // Determine CSS Class & Buttons based on status
        if (log.status.includes('Duplicate') || log.status.includes('Paused')) {
          cssClass = 'warn';
          actionsHtml = `
            <div class="actions">
              <button class="btn btn-cancel" data-id="${log.id}">🗑️ Cancel Download</button>
              <button class="btn btn-keep" data-id="${log.id}">⬇️ Keep File</button>
            </div>
          `;
        } else if (log.status.includes('Cancelled')) {
          cssClass = 'cancelled';
        }

        div.className = `card ${cssClass}`;
        div.innerHTML = `
          <div class="row">
            <span class="fname" title="${log.name}">${log.name}</span>
            <span class="fsize">${log.size}</span>
          </div>
          <span class="status-msg">${log.status}</span>
          ${actionsHtml}
        `;
        list.appendChild(div);
      });

      // Update Top Stats
      dupCountLabel.innerText = duplicates;
      savedMemLabel.innerText = formatBytes(savedBytes);

      attachListeners();
    });
  }

  function attachListeners() {
    // Handle Cancel Clicks
    document.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        
        chrome.downloads.cancel(id, () => {
          // Mark as cancelled and refresh UI
          updateLogStatus(id, "🚫 Cancelled", "cancelled");
        });
      });
    });

    // Handle Keep Clicks
    document.querySelectorAll('.btn-keep').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        chrome.downloads.resume(id, () => {
          updateLogStatus(id, "✅ Resumed", "safe");
        });
      });
    });
  }

  function updateLogStatus(id, newStatus, newType) {
    chrome.storage.local.get({ logs: [] }, (data) => {
      const updatedLogs = data.logs.map(log => {
        if (log.id === id) {
          log.status = newStatus;
          log.type = newType;
        }
        return log;
      });
      chrome.storage.local.set({ logs: updatedLogs }, render);
    });
  }

  // Clear History Button
  document.getElementById('clear').addEventListener('click', () => {
    chrome.storage.local.set({ logs: [] }, render);
  });

  // Helper: "1.2 MB" -> 1258291 bytes (Fallback)
  function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const parts = sizeStr.split(' ');
    const num = parseFloat(parts[0]);
    if (parts[1] === 'KB') return num * 1024;
    if (parts[1] === 'MB') return num * 1024 * 1024;
    if (parts[1] === 'GB') return num * 1024 * 1024 * 1024;
    return num;
  }

  // Helper: 1258291 -> "1.2 MB"
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
  }

  render();
});