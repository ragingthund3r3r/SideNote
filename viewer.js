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

        const noteBody = document.createElement("p");
        noteBody.className = "noteBody";
        noteBody.textContent = text;

        noteHolder.appendChild(noteBody);

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