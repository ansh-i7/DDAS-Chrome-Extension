chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  chrome.downloads.search({ fileSize: item.fileSize, state: 'complete' }, (results) => {
    const duplicates = results.filter(f => f.id !== item.id);

    // Prepare common data
    const sizeStr = formatBytes(item.fileSize);

    if (duplicates.length > 0) {
      // DUPLICATE DETECTED
      const original = duplicates[0];
      
      // Save log WITH ID (Important for the popup buttons!)
      saveLog(item.id, item.filename, sizeStr, `⚠️ Paused (Duplicate of ${original.filename})`);

      // Notification
      chrome.notifications.create(item.id.toString(), {
        type: 'basic',
        iconUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        title: 'Duplicate Detected!',
        message: `Duplicate of: ${original.filename}`,
        buttons: [{ title: 'Cancel' }, { title: 'Keep' }],
        priority: 2,
        requireInteraction: true
      });

      suggest();
      chrome.downloads.pause(item.id);

    } else {
      // SAFE FILE
      saveLog(item.id, item.filename, sizeStr, "✅ Safe");
      suggest();
    }
  });
  return true;
});

// Helper: Save Log
function saveLog(id, name, size, status) {
  chrome.storage.local.get({ logs: [] }, (data) => {
    const newLogs = [{ 
      id: id,     // <--- WE NEED THIS ID FOR THE POPUP BUTTONS
      name: name,
      size: size,
      status: status,
      time: new Date().toLocaleTimeString() 
    }, ...data.logs].slice(0, 20);
    chrome.storage.local.set({ logs: newLogs });
  });
}

// Helper: Format Bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + ['B', 'KB', 'MB'][i];
}