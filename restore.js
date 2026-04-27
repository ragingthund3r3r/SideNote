const DB_NAME = "sidenote-storage";
const STORE_NAME = "keyval";
const HANDLE_KEY = "authorizedFolderHandle";
const DEL_COLL_TABS_FLAG_STORAGE_KEY = "sidenote.deleteCollapsedTabsFileFlag";

function handleRestoreFromHash() {
  const hash = window.location.hash.slice(1);

  if (!hash) return;

  restoreTabs(hash);
}


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


async function restoreTabs(hash) {
  console.log("Restoring tabs for:", hash);

  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }

  const tabsSubFolderHandle = await authorizedHandle.getDirectoryHandle("tabsCompressed", { create: true });
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const currTabId = tab?.id;
  try{
    const fileHandle = await tabsSubFolderHandle.getFileHandle(hash+".md");
    const file = await fileHandle.getFile();

    const content = await file.text();
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    console.log(lines)

    for (const url of lines) {
        await chrome.tabs.create({ url });
    }

    const delFile = localStorage.getItem(DEL_COLL_TABS_FLAG_STORAGE_KEY);
    if (delFile === "false") {
    } else {
        await tabsSubFolderHandle.removeEntry(hash+".md");
    }

    await chrome.tabs.remove(currTabId);

  } catch (error) {
    console.error(error);
  }


}

document.getElementById("restoreTabs").addEventListener("click", handleRestoreFromHash);

function applyTheme() {
  const savedTheme = localStorage.getItem('sidenote-theme');
  const legacyDarkMode = localStorage.getItem('sidenote.darkModeFlag');
  
  if (savedTheme === 'light' || legacyDarkMode === 'false') {
      document.body.classList.add('light-theme');
  } else {
      document.body.classList.remove('light-theme');
  }

  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
      themeToggle.textContent = document.body.classList.contains('light-theme') ? 'Dark Mode' : 'Light Mode';
  }
}

applyTheme();

const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        themeToggle.textContent = isLight ? 'Dark Mode' : 'Light Mode';
        localStorage.setItem('sidenote-theme', isLight ? 'light' : 'dark');
        localStorage.setItem('sidenote.darkModeFlag', (!isLight).toString());
    });
}
