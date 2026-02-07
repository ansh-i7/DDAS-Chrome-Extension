chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    duplicates: [],
    storageSaved: 0,
    hashes: {}   // NEW
  });
});
// Listener: Triggered when a download is about to start
chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {

  // 1. Log the new download
  console.log(`[DDAS] New Download: ${item.filename} | Size: ${item.fileSize}`);

  if (!item.fileSize || item.fileSize <= 0) {
    suggest();
    return;
  }

  // 2. Search for existing files with the SAME SIZE
  chrome.downloads.search({ fileSize: item.fileSize, state: 'complete' }, (results) => {
    
    const others = results.filter(f => f.id !== item.id);

    // If no files have the same size, it is SAFE.
    if (others.length === 0) {
      saveLog({
        id: item.id, 
        name: getBasename(item.filename), 
        sizeStr: formatBytes(item.fileSize), 
        rawSize: item.fileSize, 
        status: "✅ Safe", 
        type: "safe"
      });
      suggest();
      return;
    }

    // 3. SMART CHECK: Compare "Cleaned" Names
    const currentClean = cleanName(item.filename);
    const duplicate = others.find(f => cleanName(f.filename) === currentClean);

    if (duplicate) {
      // --- DUPLICATE DETECTED ---
      const originalName = getBasename(duplicate.filename);
      const sizeStr = formatBytes(item.fileSize);

      // Show Notification
      chrome.notifications.create(item.id.toString(), {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: 'Duplicate Detected!',
        message: `You already have "${originalName}" (${sizeStr}).`,
        buttons: [{ title: 'Cancel Download' }, { title: 'Download Anyway' }],
        priority: 2,
        requireInteraction: true
      });

      // ✅ STEP 1: Save as "duplicate" immediately
      saveLog({
        id: item.id, 
        name: getBasename(item.filename), 
        sizeStr: sizeStr, 
        rawSize: item.fileSize, 
        status: `⚠️ Duplicate of ${originalName}`, 
        type: "duplicate" // <--- Forces counter to 1
      });

      suggest({ filename: item.filename, conflictAction: 'uniquify' });
      chrome.downloads.pause(item.id);

    } else {
      // --- SAFE ---
      saveLog({
        id: item.id, 
        name: getBasename(item.filename), 
        sizeStr: formatBytes(item.fileSize), 
        rawSize: item.fileSize, 
        status: "✅ Safe", 
        type: "safe"
      });
      suggest();
    }
  });

  return true; // Keep channel open
});

// --- BUTTON CLICK HANDLER (The "Download Anyway" Logic) ---

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  const downloadId = parseInt(notifId);
  
  if (btnIdx === 0) {
    // USER CLICKED: "Cancel Download"
    chrome.downloads.cancel(downloadId);
    updateLogStatusBg(downloadId, "🚫 Cancelled", "cancelled"); // Updates Memory Saved
  } else {
    // USER CLICKED: "Download Anyway"
    chrome.downloads.resume(downloadId);
    
    // ✅ STEP 2: KEEP TYPE AS "duplicate"
    // Previously, this was setting it to "safe", which reset the counter to 0.
    updateLogStatusBg(downloadId, "✅ Resumed (Duplicate)", "duplicate"); 
  }
  
  chrome.notifications.clear(notifId);
});

// --- HELPER FUNCTIONS ---

function cleanName(path) {
  if (!path) return "";
  let name = path.split(/[\\/]/).pop();
  return name.replace(/\s\(\d+\)(\.[^.]+)$/, '$1').toLowerCase();
}

function getBasename(path) {
  if (!path) return "";
  return path.split(/[\\/]/).pop();
}

function saveLog(params) {
  const { id, name, sizeStr, rawSize, status, type } = params;
  chrome.storage.local.get({ logs: [] }, (data) => {
    const newLogs = [{
      id, name, size: sizeStr, rawSize, status, type,
      time: new Date().toLocaleTimeString()
    }, ...data.logs].slice(0, 20);
    chrome.storage.local.set({ logs: newLogs });
  });
}

function updateLogStatusBg(id, newStatus, newType) {
    chrome.storage.local.get({ logs: [] }, (data) => {
      const updatedLogs = data.logs.map(log => {
        if (log.id === id) {
          log.status = newStatus;
          log.type = newType;
        }
        return log;
      });
      chrome.storage.local.set({ logs: updatedLogs });
    });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB', 'GB'][i];
}
async function generateHashFromFile(path) {
  try {
    const fileUrl = "file:///" + path.replace(/\\/g, "/");
    const response = await fetch(fileUrl);
    const buffer = await response.arrayBuffer();

    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (e) {
    console.log("[DDAS] Hash error:", e);
    return null;
  }
}
chrome.downloads.onChanged.addListener((delta) => {
  if (delta.state && delta.state.current === "complete") {
    
    chrome.downloads.search({ id: delta.id }, async (items) => {
      if (!items || !items.length) return;
      
      const file = items[0];
      if (!file.filename) return;

      const hash = await generateHashFromFile(file.filename);
      if (!hash) return;

      chrome.storage.local.get({ hashes: {} }, (data) => {
        const hashes = data.hashes;

        // Check for identical content
        const existingId = Object.keys(hashes).find(
          key => hashes[key] === hash && parseInt(key) !== file.id
        );

        if (existingId) {
          console.log("[DDAS] HASH DUPLICATE DETECTED");

          chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Content Duplicate Detected",
            message: "This file has identical content to a previously downloaded file.",
            priority: 2
          });

          saveLog({
            id: file.id,
            name: getBasename(file.filename),
            sizeStr: formatBytes(file.fileSize || 0),
            rawSize: file.fileSize || 0,
            status: "⚠️ Content duplicate (hash match)",
            type: "duplicate"
          });
        }

        hashes[file.id] = hash;
        chrome.storage.local.set({ hashes });
      });
    });
  }
});