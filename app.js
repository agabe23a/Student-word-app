const editor = document.getElementById("editor");
const statusText = document.getElementById("status");
const docListEl = document.getElementById("docList");
const newDocBtn = document.getElementById("newDocBtn");
const wordCountEl = document.getElementById("wordCount");
const extraStatsEl = document.getElementById("extraStats");

const docTitleInput = document.getElementById("docTitle");
const deleteBtn = document.getElementById("deleteBtn");
const renameBtn = document.getElementById("renameBtn");
const favoriteBtn = document.getElementById("favoriteBtn");

const createdAtEl = document.getElementById("createdAt");
const updatedAtEl = document.getElementById("updatedAt");
const docIdEl = document.getElementById("docId");
const versionListEl = document.getElementById("versionList");

const menuToggleBtn = document.getElementById("menuToggleBtn");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const toast = document.getElementById("toast");
const emptyDocsState = document.getElementById("emptyDocsState");

const searchDocsInput = document.getElementById("searchDocs");
const themeSelect = document.getElementById("themeSelect");

const backupBtn = document.getElementById("backupBtn");
const restoreInput = document.getElementById("restoreInput");
const importTxtInput = document.getElementById("importTxtInput");

const textColorPicker = document.getElementById("textColorPicker");
const highlightColorPicker = document.getElementById("highlightColorPicker");

let docs = JSON.parse(localStorage.getItem("docs")) || [];
let currentDocId = localStorage.getItem("currentDocId") || null;
let saveTimeout = null;

// =========================
// INITIAL SETUP
// =========================
function createDefaultDoc(name = "Untitled Document") {
  const now = new Date().toISOString();
  return {
    id: String(Date.now() + Math.floor(Math.random() * 1000)),
    name,
    content: "",
    versions: [],
    createdAt: now,
    updatedAt: now,
    favorite: false
  };
}

function saveDocs() {
  localStorage.setItem("docs", JSON.stringify(docs));
  localStorage.setItem("currentDocId", currentDocId ?? "");
}

function setStatus(message) {
  statusText.textContent = message;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function formatDate(dateString) {
  if (!dateString) return "--";
  const d = new Date(dateString);
  return d.toLocaleString();
}

function getCurrentDoc() {
  return docs.find(doc => doc.id === currentDocId) || null;
}

function ensureAtLeastOneDoc() {
  if (docs.length === 0) {
    const doc = createDefaultDoc("My First Document");
    docs.push(doc);
    currentDocId = doc.id;
    saveDocs();
  } else if (!getCurrentDoc()) {
    currentDocId = docs[0].id;
    saveDocs();
  }
}

// =========================
// RENDER DOCUMENT LIST
// =========================
function renderDocs(filter = "") {
  docListEl.innerHTML = "";

  const filteredDocs = docs
    .filter(doc => doc.name.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      if (emptyDocsState) emptyDocsState.style.display = "block";
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  if (emptyDocsState) emptyDocsState.style.display = "none";
  if (filteredDocs.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No documents found";
    li.style.opacity = "0.6";
    li.style.cursor = "default";
    docListEl.appendChild(li);
    return;
  }

  filteredDocs.forEach(doc => {
    const li = document.createElement("li");
    li.className = doc.id === currentDocId ? "active" : "";
    li.title = `${doc.name} • Last updated: ${formatDate(doc.updatedAt)}`;

    const star = doc.favorite ? "★ " : "";
    li.textContent = `${star}${doc.name}`;
    li.onclick = () => loadDoc(doc.id);

    docListEl.appendChild(li);
  });
}

// =========================
// LOAD DOCUMENT
// =========================
function loadDoc(id) {
  const doc = docs.find(d => d.id === id);
  if (!doc) return;

  currentDocId = doc.id;
  editor.innerHTML = doc.content || "";
  docTitleInput.value = doc.name || "";
  createdAtEl.textContent = formatDate(doc.createdAt);
  updatedAtEl.textContent = formatDate(doc.updatedAt);
  docIdEl.textContent = doc.id;
  favoriteBtn.textContent = doc.favorite ? "★ Favorite" : "☆ Favorite";

  updateWordCount();
  renderVersionHistory();
  renderDocs(searchDocsInput.value.trim());
  saveDocs();
  setStatus("Loaded");
}

// =========================
// NEW DOCUMENT
// =========================
function newDoc() {
  const name = prompt("Enter document name:")?.trim();
  const newDocument = createDefaultDoc(name || `Untitled Document ${docs.length + 1}`);
  docs.unshift(newDocument);
  currentDocId = newDocument.id;
  saveDocs();
  renderDocs(searchDocsInput.value.trim());
  loadDoc(newDocument.id);
  setStatus("New document created");
  showToast("New document created");
}

// =========================
// DELETE DOCUMENT
// =========================
function deleteCurrentDoc() {
  const doc = getCurrentDoc();
  if (!doc) return;

  const ok = confirm(`Delete "${doc.name}"? This action cannot be undone.`);
  if (!ok) return;

  docs = docs.filter(d => d.id !== currentDocId);

  if (docs.length === 0) {
    const freshDoc = createDefaultDoc("My First Document");
    docs.push(freshDoc);
    currentDocId = freshDoc.id;
  } else {
    currentDocId = docs[0].id;
  }
  sidebar?.classList.remove("open");
sidebarOverlay?.classList.remove("show");

  saveDocs();
  renderDocs(searchDocsInput.value.trim());
  loadDoc(currentDocId);
  setStatus("Document deleted");
  showToast("Document deleted");
}

// =========================
// RENAME DOCUMENT
// =========================
function renameCurrentDoc() {
  const doc = getCurrentDoc();
  if (!doc) return;

  const newName = prompt("Enter new document name:", doc.name);
  if (!newName || !newName.trim()) return;

  doc.name = newName.trim();
  doc.updatedAt = new Date().toISOString();
  docTitleInput.value = doc.name;

  saveDocs();
  renderDocs(searchDocsInput.value.trim());
  updateMeta();
  setStatus("Document renamed");
  showToast("Document renamed");
}

// =========================
// FAVORITE DOCUMENT
// =========================
function toggleFavorite() {
  const doc = getCurrentDoc();
  if (!doc) return;

  doc.favorite = !doc.favorite;
  doc.updatedAt = new Date().toISOString();

  saveDocs();
  renderDocs(searchDocsInput.value.trim());
  updateMeta();
  favoriteBtn.textContent = doc.favorite ? "★ Favorite" : "☆ Favorite";
  setStatus(doc.favorite ? "Marked as favorite" : "Removed from favorites");
  showToast(doc.favorite ? "Added to favorites" : "Removed from favorites");
}

// =========================
// UPDATE META
// =========================
function updateMeta() {
  const doc = getCurrentDoc();
  if (!doc) return;

  createdAtEl.textContent = formatDate(doc.createdAt);
  updatedAtEl.textContent = formatDate(doc.updatedAt);
  docIdEl.textContent = doc.id;
}

// =========================
// VERSION HISTORY
// =========================
function renderVersionHistory() {
  const doc = getCurrentDoc();
  versionListEl.innerHTML = "";

  if (!doc || !doc.versions || doc.versions.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No versions yet";
    li.style.opacity = "0.6";
    versionListEl.appendChild(li);
    return;
  }

  const latestVersions = [...doc.versions].slice(-10).reverse();

  latestVersions.forEach((version, index) => {
    const li = document.createElement("li");
    const actualIndex = doc.versions.length - 1 - index;
    li.textContent = `Version ${actualIndex + 1} • ${formatDate(version.savedAt)}`;
    li.onclick = () => restoreVersion(actualIndex);
    versionListEl.appendChild(li);
  });
}

function restoreVersion(versionIndex) {
  const doc = getCurrentDoc();
  if (!doc || !doc.versions[versionIndex]) return;

  const ok = confirm("Restore this version?");
  if (!ok) return;

  doc.content = doc.versions[versionIndex].content;
  doc.updatedAt = new Date().toISOString();

  editor.innerHTML = doc.content;
  saveDocs();
  updateMeta();
  updateWordCount();
  renderVersionHistory();
  renderDocs(searchDocsInput.value.trim());
  setStatus("Version restored");
}

// =========================
// AUTO-SAVE
// =========================
function saveCurrentDoc() {
  const doc = getCurrentDoc();
  if (!doc) return;

  const currentContent = editor.innerHTML;
  const currentTitle = docTitleInput.value.trim() || "Untitled Document";

  doc.name = currentTitle;
  doc.content = currentContent;
  doc.updatedAt = new Date().toISOString();

  const latestVersion = doc.versions[doc.versions.length - 1];
  if (!latestVersion || latestVersion.content !== currentContent) {
    doc.versions.push({
      content: currentContent,
      savedAt: new Date().toISOString()
    });

    if (doc.versions.length > 50) {
      doc.versions.shift();
    }
  }

  saveDocs();
  updateMeta();
  renderDocs(searchDocsInput.value.trim());
  renderVersionHistory();
  updateWordCount();
  setStatus("Saved");
  showToast("All changes saved");
}

editor.addEventListener("input", () => {
  if (!getCurrentDoc()) return;
  setStatus("Saving...");
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveCurrentDoc, 500);
});

docTitleInput.addEventListener("input", () => {
  if (!getCurrentDoc()) return;
  setStatus("Saving...");
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveCurrentDoc, 500);
});

// =========================
// SEARCH
// =========================
searchDocsInput.addEventListener("input", e => {
  renderDocs(e.target.value.trim());
});

// =========================
// WORD COUNT + STATS
// =========================
function updateWordCount() {
  const text = editor.innerText.trim();

  if (!text) {
    wordCountEl.textContent = "Words: 0 | Chars: 0";
    extraStatsEl.textContent = "Paragraphs: 0 | Reading time: 0 min";
    return;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  const chars = text.length;
  const paragraphs = text.split(/\n+/).filter(p => p.trim() !== "").length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  wordCountEl.textContent = `Words: ${words} | Chars: ${chars}`;
  extraStatsEl.textContent = `Paragraphs: ${paragraphs} | Reading time: ${readingTime} min`;
}

// =========================
// TOOLBAR
// =========================
function format(command, value = null) {
  editor.focus();
  document.execCommand(command, false, value);
}

function undo() {
  editor.focus();
  document.execCommand("undo");
}

function redo() {
  editor.focus();
  document.execCommand("redo");
}

function clearFormatting() {
  editor.focus();
  document.execCommand("removeFormat", false, null);
}

textColorPicker?.addEventListener("input", e => {
  format("foreColor", e.target.value);
});

highlightColorPicker?.addEventListener("input", e => {
  format("hiliteColor", e.target.value);
});

// Make toolbar functions global for HTML buttons
window.format = format;
window.undo = undo;
window.redo = redo;
window.clearFormatting = clearFormatting;

// =========================
// EXPORTS
// =========================
function exportTXT() {
  const doc = getCurrentDoc();
  if (!doc) return;

  const blob = new Blob([editor.innerText], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.name}.txt`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("TXT exported");
}

function exportPDF() {
  const doc = getCurrentDoc();
  if (!doc) return;

  html2pdf()
    .set({
      margin: 10,
      filename: `${doc.name}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(editor)
    .save();

  setStatus("Exporting PDF...");
}

function exportHTML() {
  const doc = getCurrentDoc();
  if (!doc) return;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${doc.name}</title>
</head>
<body>
  ${doc.content}
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${doc.name}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("HTML exported");
}

window.exportTXT = exportTXT;
window.exportPDF = exportPDF;
window.exportHTML = exportHTML;

// =========================
// IMPORT TXT
// =========================
importTxtInput?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const content = event.target.result;
    const newDocument = createDefaultDoc(file.name.replace(".txt", ""));
    newDocument.content = content
      .split("\n")
      .map(line => `<p>${escapeHTML(line)}</p>`)
      .join("");

    newDocument.versions.push({
      content: newDocument.content,
      savedAt: new Date().toISOString()
    });

    newDocument.updatedAt = new Date().toISOString();

    docs.unshift(newDocument);
    currentDocId = newDocument.id;
    saveDocs();
    renderDocs(searchDocsInput.value.trim());
    loadDoc(newDocument.id);
    setStatus("TXT imported");
  };

  reader.readAsText(file);
  e.target.value = "";
});

// =========================
// BACKUP JSON
// =========================
backupBtn?.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(docs, null, 2)], {
    type: "application/json;charset=utf-8"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "docs-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus("Backup downloaded");
});

// =========================
// RESTORE JSON
// =========================
restoreInput?.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const restoredDocs = JSON.parse(event.target.result);

      if (!Array.isArray(restoredDocs)) {
        alert("Invalid backup file");
        return;
      }

      const ok = confirm("Restore backup? Current documents will be replaced.");
      if (!ok) return;

      docs = restoredDocs;
      ensureAtLeastOneDoc();
      saveDocs();
      renderDocs();
      loadDoc(currentDocId);
      setStatus("Backup restored");
    } catch (error) {
      alert("Failed to restore backup. Invalid JSON file.");
      console.error(error);
    }
  };

  reader.readAsText(file);
  e.target.value = "";
});

// =========================
// THEME SYSTEM
// =========================
function applyTheme(theme) {
  document.body.classList.remove("dark", "sepia", "midnight");

  if (theme === "dark") {
    document.body.classList.add("dark");
  } else if (theme === "sepia") {
    document.body.classList.add("sepia");
  } else if (theme === "midnight") {
    document.body.classList.add("midnight");
  }

  localStorage.setItem("theme", theme);
}

themeSelect?.addEventListener("change", e => {
  applyTheme(e.target.value);
  setStatus(`Theme: ${e.target.value}`);
});

// =========================
// HELPERS
// =========================
function escapeHTML(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// BUTTON EVENTS
// =========================
newDocBtn?.addEventListener("click", newDoc);
deleteBtn?.addEventListener("click", deleteCurrentDoc);
renameBtn?.addEventListener("click", renameCurrentDoc);
favoriteBtn?.addEventListener("click", toggleFavorite);

menuToggleBtn?.addEventListener("click", () => {
  sidebar?.classList.toggle("open");
  sidebarOverlay?.classList.toggle("show");
});

sidebarOverlay?.addEventListener("click", () => {
  sidebar?.classList.remove("open");
  sidebarOverlay?.classList.remove("show");
});

// =========================
// LOAD APP
// =========================
(function init() {
  ensureAtLeastOneDoc();

  const savedTheme = localStorage.getItem("theme") || "light";
  themeSelect.value = savedTheme;
  applyTheme(savedTheme);

  renderDocs();
  loadDoc(currentDocId);
  setStatus("Ready");
})();

// =========================
// SERVICE WORKER
// =========================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js")
    .catch(err => console.error("Service worker registration failed:", err));
}
