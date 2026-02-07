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
        return;
      }

      data.logs.forEach(log => {
        // Calculate Stats
        if (log.status.includes('Paused') || log.status.includes('Cancelled')) {
          duplicates++;
          if (log.status.includes('Cancelled')) {
            savedBytes += parseSize(log.size); // Add to memory saved
          }
        }

        const div = document.createElement('div');
        let cssClass = 'safe';
        let actionsHtml = '';

        // IF PAUSED: Show Cancel/Keep Buttons
        if (log.status.includes('Paused')) {
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

      // Attach Click Listeners to the new buttons
      attachListeners();
    });
  }

  function attachListeners() {
    // Handle Cancel Clicks
    document.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        
        // 1. Cancel the download in Chrome
        chrome.downloads.cancel(id, () => {
          // 2. Update the log status to "Cancelled" so it turns red
          updateLogStatus(id, "🚫 Cancelled");
        });
      });
    });

    // Handle Keep Clicks
    document.querySelectorAll('.btn-keep').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.target.dataset.id);
        chrome.downloads.resume(id, () => {
          updateLogStatus(id, "✅ Resumed");
        });
      });
    });
  }

  function updateLogStatus(id, newStatus) {
    chrome.storage.local.get({ logs: [] }, (data) => {
      const updatedLogs = data.logs.map(log => {
        if (log.id === id) log.status = newStatus;
        return log;
      });
      chrome.storage.local.set({ logs: updatedLogs }, render);
    });
  }

  // Clear History Button
  document.getElementById('clear').addEventListener('click', () => {
    chrome.storage.local.set({ logs: [] }, render);
  });

  // Helper: "1.2 MB" -> 1258291 bytes
  function parseSize(sizeStr) {
    if (!sizeStr) return 0;
    const parts = sizeStr.split(' ');
    const num = parseFloat(parts[0]);
    if (parts[1] === 'KB') return num * 1024;
    if (parts[1] === 'MB') return num * 1024 * 1024;
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