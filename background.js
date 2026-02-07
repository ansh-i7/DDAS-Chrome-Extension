// Listener: Triggered when a download is about to start
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  
  // 1. Log the new download
  console.log(`[DDAS] New Download: ${item.filename} | Size: ${item.fileSize}`);

  // Safety: Ignore empty/missing size
  if (!item.fileSize || item.fileSize <= 0) {
    suggest();
    return;
  }

  // 2. Search for existing files with the SAME SIZE
  chrome.downloads.search({ fileSize: item.fileSize, state: 'complete' }, (results) => {
    
    // Filter out the current download itself
    const others = results.filter(f => f.id !== item.id);

    // If no files have the same size, it is safe.
    if (others.length === 0) {
      console.log("[DDAS] No file with same size found. SAFE.");
      suggest();
      return;
    }

    // 3. SMART CHECK: Compare "Cleaned" Names
    const currentClean = cleanName(item.filename);
    console.log(`[DDAS] Cleaned Name: ${currentClean}`);

    const duplicate = others.find(f => {
      const existingClean = cleanName(f.filename);
      // Log comparisons to see why it matches
      console.log(`   Comparing vs: ${existingClean} (${f.filename})`);
      return existingClean === currentClean;
    });

    if (duplicate) {
      // --- DUPLICATE DETECTED ---
      console.log(`[DDAS] MATCH FOUND! Duplicate of: ${duplicate.filename}`);
      
      const originalName = getBasename(duplicate.filename);
      const sizeStr = formatBytes(item.fileSize);

      // Notification
      chrome.notifications.create(item.id.toString(), {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: 'Duplicate Detected!',
        message: `You already have "${originalName}" (${sizeStr}).`,
        buttons: [{ title: 'Cancel Download' }, { title: 'Download Anyway' }],
        priority: 2,
        requireInteraction: true
      });

      // Log to Popup
      saveLog(item.id, getBasename(item.filename), sizeStr, `⚠️ Duplicate of ${originalName}`);

      // Suggest the original filename (prevents some renaming issues)
      // then PAUSE it.
      suggest({ filename: item.filename, conflictAction: 'uniquify' });
      chrome.downloads.pause(item.id);

    } else {
      // --- SAFE (Size match, but Name different) ---
      console.log("[DDAS] Size matched, but Name different. SAFE.");
      saveLog(item.id, getBasename(item.filename), formatBytes(item.fileSize), "✅ Safe");
      suggest();
    }
  });

  return true; // Keep channel open
});

// --- HELPER FUNCTIONS ---

// Cleans "Report (1).pdf" -> "report.pdf"
function cleanName(path) {
  if (!path) return "";
  let name = path.split(/[\\/]/).pop(); // Get filename from path
  // Regex: Removes " (digits)" before the extension
  return name.replace(/\s\(\d+\)(\.[^.]+)$/, '$1').toLowerCase();
}

function getBasename(path) {
  if (!path) return "";
  return path.split(/[\\/]/).pop();
}

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  const downloadId = parseInt(notifId);
  if (btnIdx === 0) {
    chrome.downloads.cancel(downloadId);
  } else {
    chrome.downloads.resume(downloadId);
  }
  chrome.notifications.clear(notifId);
});

function saveLog(id, name, size, status) {
  chrome.storage.local.get({ logs: [] }, (data) => {
    const newLogs = [{ 
      id: id, 
      name: name,
      size: size,
      status: status,
      time: new Date().toLocaleTimeString() 
    }, ...data.logs].slice(0, 20);
    chrome.storage.local.set({ logs: newLogs });
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB'][i];
}