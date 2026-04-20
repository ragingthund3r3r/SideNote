const DB_NAME = "sidenote-storage";
const STORE_NAME = "keyval";
const HANDLE_KEY = "authorizedFolderHandle";
const METADATA_STORAGE_KEY = "sidenote.metadataRows";


async function refreshAuthorizationStatus() {
  if (!window.showDirectoryPicker) {
    let status = "Can't open the folder selector :("
    setStatus(status, true);
    alert(status);
    return;
  }

  const handle = await getStoredHandle();
  if (!handle) {
    setStatus("Folder access not authorized yet.");
    return;
  }

  setStatus(`Authorized Location: ${handle.name}`);

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

async function setStoredHandle(handle) {
  const db = await openDb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
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

function setStatus(message, isError = false) {
  const statusEl = document.getElementById("fsStatus");
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#ff8f8f" : "#9fd59f";
}

async function authorizeFolderAccess() {
  try {
    if (!window.showDirectoryPicker) {
      let status = "Can't open the folder selector :("
      setStatus(status, true);
      alert(status);
      return;
    }

    const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
    const permission = await dirHandle.requestPermission({ mode: "readwrite" });

    if (permission !== "granted") {
      setStatus("Authorization was not granted.", true);
      return;
    }

    await setStoredHandle(dirHandle);
    setStatus(`Authorized Location: ${dirHandle.name}`);
  } catch (error) {
    if (error && error.name === "AbortError") {
      
      const handle = await getStoredHandle();
      if (!handle){
        setStatus("Authorization canceled.", true);
        return
      }
      const permission = await handle.queryPermission({ mode: "readwrite" });
      if (permission === "granted") {
        setStatus(`Authorized Location: ${handle.name}`);
      } else {
        setStatus("Authorization canceled.", true);
      }

      return;
    }
    console.error(error);
    setStatus("Authorization failed. Check console for details.", true);
  }
}

async function ensureStoredHandleAuthorizedWithoutPicker() {
  const storedHandle = await getStoredHandle();
  if (!storedHandle) {
    setStatus("Setup location first", true);
    return null;
  }

  try {
    const requestedPermission = await storedHandle.requestPermission({ mode: "readwrite" });
    if (requestedPermission === "granted") {
      setStatus(`Authorized Location: ${storedHandle.name}`);
      return storedHandle;
    }

    setStatus("Reset the folder location", true);
    return null;
  } catch (error) {
    console.error(error);
    setStatus("Reset the folder location", true);
    return null;
  }
}

async function fileExists(folderHandle, name) {
  try {
    await folderHandle.getFileHandle(name);
    return true;  
  } catch (error) {
    if (error.name === "NotFoundError") {
      return false; 
    }
    throw error; 
  }
}

function createSidebarMetadataRow(data = { enabled: true, key: "", value: "" }) {
  const row = document.createElement("div");
  row.className = "meta-grid meta-row";

  const checkboxWrap = document.createElement("div");
  checkboxWrap.className = "checkbox-wrap";

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.className = "meta-enabled";
  enabledInput.checked = Boolean(data.enabled);
  checkboxWrap.appendChild(enabledInput);

  const keyInput = document.createElement("div");
  keyInput.className = "meta-key meta-key-readonly";
  keyInput.textContent = data.key || "";

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "meta-value";
  valueInput.value = data.value || "";

  row.appendChild(checkboxWrap);
  row.appendChild(keyInput);
  row.appendChild(valueInput);

  return row;
}

function loadSidebarMetadataRows() {
  const container = document.getElementById("sidebarMetadataRows");
  if (!container) {
    return;
  }

  container.innerHTML = "";

  try {
    const raw = localStorage.getItem(METADATA_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return;
    }

    parsed.forEach((item) => {
      container.appendChild(createSidebarMetadataRow(item));
    });
  } catch (error) {
    console.error(error);
    setStatus("Failed to load metadata from settings.", true);
  }
}

async function createMarkdownFile(folderHandle, paramtitle, parambody= "") {
  let title = paramtitle
  let extension = ".md"
  let body = parambody
  let counter = 0
  let fileHandle

  if(title == ""){
    title ="Untitled"
  }

  let doesfileexist = await fileExists(folderHandle, title + extension);
  
  
  while(doesfileexist){
    counter +=1
    doesfileexist = await fileExists(folderHandle, title +" "+counter+ extension);
  }

  if (counter == 0 ){
    fileHandle = await folderHandle.getFileHandle(title + extension, { create: true });
  }else{
    fileHandle = await folderHandle.getFileHandle(title +" "+counter+ extension, { create: true });
  }

  let yaml = "---\n"
  let allMetaRows = document.getElementsByClassName("meta-row")
  for(let row of allMetaRows){
    let rowData = ""
    let checkbox = row.querySelector(".meta-enabled");

    if (checkbox) {
      if (checkbox.checked) {
        console.log("Checked");
        let keyEl = row.querySelector(".meta-key") ?? ""
        let keyData = keyEl ? keyEl.textContent : "";

        rowData= rowData + keyData + ":"

        let valueEl = row.querySelector(".meta-value");
        let valueData = valueEl ? valueEl.value.trim() : "";

        if (valueData.includes("\n")){
          valueData = valueData.replace(/\r?\n/g, "\n  ");
          rowData= rowData + " |-\n" + valueData + "\n"

        }else{
          rowData= rowData + " " + valueData + "\n"
        }
        yaml = yaml + rowData        
      }
    }
  }
  yaml = yaml + "---\n\n"


  const writable = await fileHandle.createWritable();
  await writable.write(yaml + body);
  await writable.close();
}








async function onConfirmClick() {
  const titleInput = document.getElementById("fileTitleInput");
  const bodyInput = document.getElementById("fileBodyInput");

  const typedTitle = titleInput ? titleInput.value : "";
  const typedBody = bodyInput ? bodyInput.value : "";

  console.log("Typed title:", typedTitle);
  console.log("Typed body:", typedBody);

  if(typedBody == ""){
    setStatus("File Body is empty...", true);
    return
  }


  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }

  try {
    await createMarkdownFile(authorizedHandle, typedTitle, typedBody);
    setStatus("Created File!");

    closeSidePanel();
  } catch (error) {
    console.error(error);
    setStatus("Failed to create test.md", true);
  }
}

async function onCancelClick() {
  closeSidePanel();
}

function onSettingsClick() {
  try {
    const settingsUrl = chrome.runtime.getURL("settings.html");
    window.open(settingsUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    console.error(error);
    alert("Failed to open settings page.");
  }
}

function closeSidePanel() {
  window.close();
}

document.getElementById("authorizeFsBtn").addEventListener("click", authorizeFolderAccess);
document.getElementById("placeholderBtn").addEventListener("click", onSettingsClick);
document.getElementById("confirmBtn").addEventListener("click", onConfirmClick);
document.getElementById("cancelBtn").addEventListener("click", onCancelClick);
refreshAuthorizationStatus();
loadSidebarMetadataRows();
