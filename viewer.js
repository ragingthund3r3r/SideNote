import { marked } from './marked.esm.js';

const DB_NAME = "sidenote-storage";
const STORE_NAME = "keyval";
const HANDLE_KEY = "authorizedFolderHandle";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}


async function getStoredHandle() {
  const db = await openDb();
  const handle = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return handle;
}

async function ensureStoredHandleAuthorizedWithoutPicker() {
  const storedHandle = await getStoredHandle();
  if (!storedHandle) {
    return null;
  }

  try {
    const requestedPermission = await storedHandle.requestPermission({ mode: "readwrite" });
    if (requestedPermission === "granted") {
      return storedHandle;
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function refreshRenderedMarkdown() {
  let rightHalf = document.getElementById("renderedHtml")
  let markdownInput = document.getElementById("noteBodyInternal");

  let typedMarkdown = markdownInput ? markdownInput.value : "";
  rightHalf.innerHTML = marked.parse(typedMarkdown.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ''));

}

function bodyFormatting(e) {
  const el = e.target;

  function insertAtCursor(text) {
    const start = el.selectionStart;
    const end = el.selectionEnd;

    const before = el.value.substring(0, start);
    const after = el.value.substring(end);

    el.value = before + text + after;

    el.selectionStart = el.selectionEnd = start + text.length;
  }

  // TAB = 4 spaces
  if (e.key === "Tab") {
    e.preventDefault();

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = el.value;

    const indent = "    ";

    // find start of current line
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;

    const linePrefix = value.substring(lineStart, lineStart + 4);

    // -------------------------
    // SHIFT + TAB = UNINDENT
    // -------------------------
    if (e.shiftKey) {
      if (linePrefix === indent) {
        const before = value.substring(0, lineStart);
        const after = value.substring(lineStart + 4);

        el.value = before + after;

        const newCursorPos = Math.max(start - 4, lineStart);
        el.selectionStart = el.selectionEnd = newCursorPos;
      }

      return;
    }

    // -------------------------
    // TAB = INDENT
    // -------------------------
    const before = value.substring(0, lineStart);
    const after = value.substring(lineStart);

    el.value = before + indent + after;

    const newCursorPos = start + indent.length;
    el.selectionStart = el.selectionEnd = newCursorPos;
  }


  if (e.key === "Enter") {
    const value = el.value;
    const cursorPos = el.selectionStart;

    const beforeCursor = value.substring(0, cursorPos);
    const lastLine = beforeCursor.split("\n").pop();

    const bulletMatch = lastLine.match(/^(\s*[-*•]\s)(.*)/);
    const checkboxMatch = lastLine.match(/^(\s*[-*]\s\[\s\]\s)(.*)/);
    
    if (checkboxMatch){
      const checkboxPrefix = checkboxMatch[1];
      const contentAfterCheckbox = checkboxMatch[2];

      // -------------------------
      // EXIT LIST if empty checkbox
      // -------------------------
      if (contentAfterCheckbox.trim() === "") {
        e.preventDefault();

        // insert plain newline (no bullet)
        const afterCursor = value.substring(cursorPos);

        el.value =
          value.substring(0, cursorPos) +
          "\n" +
          afterCursor;

        el.selectionStart = el.selectionEnd = cursorPos + 1;
        return;
      }

      // -------------------------
      // CONTINUE CHECKBOX
      // -------------------------
      e.preventDefault();

      insertAtCursor("\n" + checkboxPrefix);

    } else if (bulletMatch) {
      const bulletPrefix = bulletMatch[1];
      const contentAfterBullet = bulletMatch[2];

      // -------------------------
      // EXIT LIST if empty bullet
      // -------------------------
      if (contentAfterBullet.trim() === "") {
        e.preventDefault();

        // insert plain newline (no bullet)
        const afterCursor = value.substring(cursorPos);

        el.value =
          value.substring(0, cursorPos) +
          "\n" +
          afterCursor;

        el.selectionStart = el.selectionEnd = cursorPos + 1;
        return;
      }

      // -------------------------
      // CONTINUE BULLET
      // -------------------------
      e.preventDefault();

      insertAtCursor("\n" + bulletPrefix);
    }
  }

  if (e.key === "(") {
    e.preventDefault();

    const start = el.selectionStart;
    const end = el.selectionEnd;

    const before = el.value.substring(0, start);
    const after = el.value.substring(end);

    el.value = before + "()" + after;

    el.selectionStart = el.selectionEnd = start + 1;
  }
  if (e.key === "{") {
    e.preventDefault();

    const start = el.selectionStart;
    const end = el.selectionEnd;

    const before = el.value.substring(0, start);
    const after = el.value.substring(end);

    el.value = before + "{}" + after;

    el.selectionStart = el.selectionEnd = start + 1;
  }
  if (e.key === "[") {
    e.preventDefault();

    const start = el.selectionStart;
    const end = el.selectionEnd;

    const before = el.value.substring(0, start);
    const after = el.value.substring(end);

    el.value = before + "[]" + after;

    el.selectionStart = el.selectionEnd = start + 1;
  }
}


async function loadHandle() {

  const folderHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!folderHandle) {
    return;
  }

  console.log(folderHandle)
  console.log(folderHandle.kind)


  const output = document.getElementById("allFileList");
  const files = [];

  for await (const [name, entry] of folderHandle.entries()) {
    if (entry.kind === 'file' && name.endsWith('.md')) {
      const file = await entry.getFile();

      files.push({
        name,
        file,
        lastModified: file.lastModified
      });
    }
  }

  files.sort((a, b) => b.lastModified - a.lastModified);

  for (const item of files) {
    const div = document.createElement("div");
    div.className = "file-item";
    div.textContent = item.name;

        div.addEventListener("click", async () => {
        document.querySelectorAll('.file-item').forEach(el => el.classList.remove('active'));
        div.classList.add('active');

        const text = await item.file.text()
        console.log("Opened file:", item.name);
        console.log(text);
        const noteHolder = document.getElementById("noteHolder");
        noteHolder.innerHTML = "";

        const noteTitle = document.createElement("h3");
        noteTitle.className = "noteTitle";
        noteTitle.textContent = item.name;

        noteHolder.appendChild(noteTitle);

        const splitContainer = document.createElement("div");
        splitContainer.style.display = "flex";
        splitContainer.style.gap = "20px";
        splitContainer.style.marginBottom = "20px";
        splitContainer.style.flex = "1";
        splitContainer.style.minHeight = "0";

        const leftHalf = document.createElement("div");
        leftHalf.style.flex = "1";
        leftHalf.style.display = "flex";
        leftHalf.style.flexDirection = "column";
        
        const rightHalf = document.createElement("div");
        rightHalf.id = "renderedHtml"
        rightHalf.style.flex = "1";
        rightHalf.innerHTML = marked.parse(text.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, ''));

        const noteBody = document.createElement("textarea");
        noteBody.id = "noteBodyInternal"

        noteBody.className = "noteBody";
        noteBody.value = text;

        leftHalf.appendChild(noteBody);
        splitContainer.appendChild(leftHalf);
        splitContainer.appendChild(rightHalf);
        noteHolder.appendChild(splitContainer);

        const buttonRow = document.createElement("div");
        buttonRow.style.display = "flex";
        buttonRow.style.justifyContent = "space-evenly";
        buttonRow.style.width = "100%";

        const button1 = document.createElement("button");
        button1.textContent = "Save";
        const button2 = document.createElement("button");
        button2.textContent = "Delete";

        buttonRow.appendChild(button1);
        buttonRow.appendChild(button2);
        noteHolder.appendChild(buttonRow);

        noteBody.addEventListener("input", refreshRenderedMarkdown);
        noteBody.addEventListener("keydown", bodyFormatting);

    });

    output.appendChild(div);
  }
}

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    const savedTheme = localStorage.getItem('sidenote-theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggle.textContent = 'Dark Mode';
    }

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        themeToggle.textContent = isLight ? 'Dark Mode' : 'Light Mode';
        localStorage.setItem('sidenote-theme', isLight ? 'light' : 'dark');
    });
}

loadHandle();