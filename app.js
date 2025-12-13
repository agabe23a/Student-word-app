const editor = document.getElementById("editor");
const statusText = document.getElementById("status");
const docListEl = document.getElementById("docList");
const newDocBtn = document.getElementById("newDocBtn");
const wordCountEl = document.getElementById("wordCount");

let docs = JSON.parse(localStorage.getItem("docs")) || [];
let currentDocId = null;

// Dark mode
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}

// --- Utilities ---
function saveDocs() {
  localStorage.setItem("docs", JSON.stringify(docs));
}

function renderDocs() {
  docListEl.innerHTML = "";
  docs.forEach((doc, index) => {
    const li = document.createElement("li");
    li.textContent = doc.name;
    li.className = currentDocId === index ? "active" : "";
    li.onclick = () => loadDoc(index);
    docListEl.appendChild(li);
  });
}

// --- Multi-Document ---
function newDoc() {
  const name = prompt("Document name:");
  if (!name) return;
  docs.push({ name: name, content: "" , versions: [] });
  currentDocId = docs.length - 1;
  editor.innerHTML = "";
  saveDocs();
  renderDocs();
}

function loadDoc(index) {
  currentDocId = index;
  editor.innerHTML = docs[index].content;
  renderDocs();
  updateWordCount();
}

// --- Auto-save with versioning ---
let timeout;
editor.addEventListener("input", () => {
  if (currentDocId === null) return;
  statusText.textContent = "Saving...";
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    // Save current content as version
    const currentContent = editor.innerHTML;
    const doc = docs[currentDocId];
    if (!doc.versions.length || doc.versions[doc.versions.length - 1] !== currentContent) {
      doc.versions.push(currentContent);
    }
    doc.content = currentContent;
    saveDocs();
    statusText.textContent = "Saved";
    updateWordCount();
  }, 500);
});

// --- Toolbar functions ---
function format(command, value = null) {
  document.execCommand(command, false, value);
}

function undo() { document.execCommand("undo"); }
function redo() { document.execCommand("redo"); }

// --- Export ---
function exportTXT() {
  if (currentDocId === null) return;
  const blob = new Blob([editor.innerText], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = docs[currentDocId].name + ".txt";
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportPDF() {
  if (currentDocId === null) return;
  html2pdf()
    .set({
      margin: 10,
      filename: docs[currentDocId].name + ".pdf",
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    })
    .from(editor)
    .save();
}

// --- Dark Mode ---
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"));
}

// --- Word Count ---
function updateWordCount() {
  if (!editor.innerText) {
    wordCountEl.textContent = "Words: 0 | Chars: 0";
    return;
  }
  const text = editor.innerText.trim();
  const words = text.split(/\s+/).length;
  const chars = text.length;
  wordCountEl.textContent = `Words: ${words} | Chars: ${chars}`;
}

// --- Initial Load ---
if (docs.length > 0) {
  currentDocId = 0;
  editor.innerHTML = docs[0].content;
  updateWordCount();
}

renderDocs();
newDocBtn.onclick = newDoc;

// --- Service Worker ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
