# 🛡️ DDAS — Smart Download Watchdog (Chrome Extension)

> **Hackathon Project | Productivity × Smart Automation**

DDAS (Duplicate Download Alert System) is an intelligent Chrome extension that prevents accidental duplicate downloads in real time. It combines **file-size heuristics, smart filename cleaning, and SHA-256 content hashing** to identify duplicates before they clutter your system or waste storage.

---

## 🚨 Problem Statement

Most users unknowingly download the same file multiple times because:

- Filenames change automatically (`file.pdf`, `file (1).pdf`)
- Browsers don’t warn about duplicates  
- Downloads folder becomes messy and bloated  

👉 **Result:** wasted storage, confusion, and time loss.

---

## 💡 Our Solution — DDAS

DDAS acts as a proactive watchdog for your downloads by:

- Detecting duplicates **before completion**
- Pausing suspicious downloads automatically  
- Giving users control via smart notifications  
- Maintaining a clean activity dashboard  

---

## ✨ Key Features

### 🔔 Real-Time Duplicate Detection  
Uses three-layer intelligence:
1. **File size matching**
2. **Cleaned filename comparison**
3. **SHA-256 content hashing (content-level match)**

### 📊 Smart Dashboard (Popup UI)  
Shows:
- Total **Duplicates Detected**
- **Memory Saved**
- Download history timeline with statuses:
  - ✅ Safe  
  - ⚠️ Duplicate  
  - 🚫 Cancelled  

Users can:
- Cancel a duplicate download  
- Resume (“Keep”) if they still want it  

### 🤖 Fully Automated  
- Works silently in the background  
- No manual configuration required  

---

## 🧠 Technical Approach  

### Background Service Worker (`background.js`)
- Listens to:
  - `chrome.downloads.onDeterminingFilename`
  - `chrome.downloads.onChanged`
- Performs:
  - Size-based filtering  
  - Smart filename normalization  
  - SHA-256 hashing via Web Crypto API  
- Uses `chrome.storage.local` to:
  - Store logs  
  - Track seen file hashes  

### Frontend Popup (`popup.html + popup.js`)
- Minimal, clean UI  
- Live stats update  
- Action buttons for user control  
- Calculates “Memory Saved” when duplicates are cancelled  

---

## 🛠️ Tech Stack

- **Platform:** Chrome Extension (Manifest V3)  
- **Languages:** JavaScript, HTML, CSS  
- **APIs Used:**
  - `chrome.downloads`
  - `chrome.notifications`
  - `chrome.storage.local`
  - Web Crypto API (`crypto.subtle.digest`)

---

## 🔐 Why These Permissions Are Needed  

This extension uses its permissions for the following purposes:

- Monitoring downloads  
- Reading files for hashing  
- Showing alerts  
- Saving history locally  

---

## 🚀 Installation (For Judges / Demo)

1. Open **Chrome**  
2. Visit: `chrome://extensions/`  
3. Enable **Developer mode** (top-right)  
4. Click **Load unpacked**  
5. Select this project folder  
6. Pin **DDAS** to the toolbar  

---

## 📂 Project Structure  

DDAS/
│── manifest.json
│── background.js
│── popup.html
│── popup.js
│── icon.png


---

## 🏆 Hackathon Impact  

| Metric | Value |
|--------|-------|
| User Pain Reduced | High |
| Automation Level | Fully Automatic |
| Storage Saved | Dynamic (tracked live) |
| Usability | One-click decisions |
| Innovation | Content-level hashing in browser |

---

## 🔮 Future Scope  

- AI-based similarity detection  
- Folder whitelisting  
- Cloud sync of history  
- Dark mode  
- Export logs as CSV  
- Cross-browser support (Firefox, Edge)

---

---