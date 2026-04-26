const DB_NAME = "sidenote-storage";
const STORE_NAME = "keyval";
const HANDLE_KEY = "authorizedFolderHandle";
const METADATA_STORAGE_KEY = "sidenote.metadataRows";
const PREFIX_TEXT_STORAGE_KEY = "sidenote.prefixText";
const TITLE_STORAGE_KEY = "sidenote.titleText";
const COLLAPSE_FLAG_STORAGE_KEY = "sidenote.collapseFlag";
const NOTE_DRAFT_STORAGE_KEY = "sidenmote.notedraft"
const DARK_MODE_FLAG_STORAGE_KEY = "sidenote.darkModeFlag";
const PREFIX_FLAG_STORAGE_KEY = "sidenote.prefixFlag";
let notesCursor = 0;
const PAGE_SIZE = 10;

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
  title = await replacePlaceholders(title)

  title = cleanTitle(title)

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

  yaml = await replacePlaceholders(yaml)

  let prefixValidEl = document.getElementById("prefixValidity")

  let prefixText

  if (prefixValidEl?.checked) {
    prefixText = readPrefixText() +"\n\n"
    
  } else{
    prefixText = ""
    
  }

  const isPrefixDisabled = localStorage.getItem(PREFIX_FLAG_STORAGE_KEY);
  if (isPrefixDisabled === "true") {
    prefixText = ""
  } 


  const writable = await fileHandle.createWritable();
  await writable.write(yaml + prefixText + body);
  await writable.close();
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return response.blob();
}

async function getUniquePngHandle(folderHandle, baseName) {
  const extension = ".png";
  let counter = 0;
  let candidate = `${baseName}${extension}`;

  while (await fileExists(folderHandle, candidate)) {
    counter += 1;
    candidate = `${baseName} ${counter}${extension}`;
  }

  return folderHandle.getFileHandle(candidate, { create: true });
}

async function saveSnapshotPng(folderHandle, pngDataUrl) {
  const now = new Date();
  const isoSafe = now.toISOString().replace(/[.:]/g, "-").replace("Z", "");
  const baseName = `snapshot-${isoSafe}`;

  const subFolderHandle = await folderHandle.getDirectoryHandle("screenshots", { create: true });
  const fileHandle = await getUniquePngHandle(subFolderHandle, baseName);

  const blob = await dataUrlToBlob(pngDataUrl);
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();

  return {
    baseName,
    fileName: fileHandle.name
  };

}

async function onCaptureSnapshotClick() {
  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }

  setStatus("Capturing viewport...");

  try {
    const response = await chrome.runtime.sendMessage({ action: "captureVisibleViewport" });

    if (!response || !response.ok || !response.dataUrl) {
      const errorMessage = response?.error || "Capture failed.";
      setStatus(errorMessage, true);
      return;
    }


    const result = await saveSnapshotPng(authorizedHandle, response.dataUrl);

    const fileName = result.fileName
    const baseName = result.baseName

    setStatus(`Saved snapshot`);

    let imageEmbedd = `\n![[${baseName}]]\n`

    const noteInput = document.getElementById("fileBodyInput");
    noteInput.value += imageEmbedd;

    noteInput.focus();
    
  } catch (error) {
    console.error(error);
    setStatus("Failed to capture snapshot.", true);
  }
}


async function onCaptureTimestampClick() {
  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }


  try {
    const response = await chrome.runtime.sendMessage({ action: "captureTimestamp" });

    if(!response.element.text){
      return
    }

    let timestamp = response.element.text
    let url = response.element.url

    let timeList = timestamp.split(":").map(Number).reverse()

    const multipliers = [1, 60, 3600, 86400];

    const weighted = timeList.map((value, index) => value * multipliers[index]);

    let weightedSum = weighted.reduce((sum, val) => sum + val, 0);

    let finTimeUrl = url + "&t=" + weightedSum

    let finstring = `[${timestamp}](${finTimeUrl})\n`

    const target = document.getElementById("fileBodyInput");

    if (target.value !== undefined) {
      const start = target.selectionStart;
      const end = target.selectionEnd;

      target.value =
        target.value.slice(0, start) +
        finstring +
        target.value.slice(end);

      target.selectionStart = target.selectionEnd =
        start + finstring.length;
    }


    
  } catch (error) {
    console.error(error);
  }
}

async function onCaptureAllTabsClick() {
  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }


  try {
    const response = await chrome.runtime.sendMessage({ action: "captureAllTabs" });

    console.log(response)

    if(!response.tabData){
      return
    }


    let listOfTabs = "\nTabs in this window:\n"

    for (const tab of response.tabData) {
      console.log(tab.url);
      let tabUrl = tab.url
      let tabTitle = tab.title
      
      listOfTabs = listOfTabs + `- [${tabTitle}](${tabUrl})\n`
       
    }

    const target = document.getElementById("fileBodyInput");

    if (target.value !== undefined) {
      const start = target.selectionStart;
      const end = target.selectionEnd;

      target.value =
        target.value.slice(0, start) +
        listOfTabs +
        target.value.slice(end);

      target.selectionStart = target.selectionEnd =
        start + listOfTabs.length;
    }


    
  } catch (error) {
    console.error(error);
  }
}


async function onCaptureThisTabClick() {
  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }


  try {
    const response = await chrome.runtime.sendMessage({ action: "captureCurrentTab" });

    console.log(response)

    if(!response.tabData){
      return
    }


    let finString = `\n\n[${response.tabData.title}](${response.tabData.url})\n`


    const target = document.getElementById("fileBodyInput");

    if (target.value !== undefined) {
      const start = target.selectionStart;
      const end = target.selectionEnd;

      target.value =
        target.value.slice(0, start) +
        finString +
        target.value.slice(end);

      target.selectionStart = target.selectionEnd =
        start + finString.length;
    }


    
  } catch (error) {
    console.error(error);
  }
}

async function onRetrivePastTenNotes() {
  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }

  let folderHandle = await getStoredHandle()

  const parent = document.getElementById("pastNotes");

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

  const nextBatch = files.slice(notesCursor, notesCursor + PAGE_SIZE);

  notesCursor += PAGE_SIZE;
  

  for (const item of nextBatch) {
    let text = await item.file.text();
    console.log(item.name, text);



    text = text.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '')
  

    const noteDiv = document.createElement("div");
    noteDiv.className = "note";

    const title = document.createElement("h3");
    title.textContent = item.name.replace(".md", "");

    const body = document.createElement("p");
    body.textContent = text;

    noteDiv.appendChild(title);
    noteDiv.appendChild(body);

    parent.appendChild(noteDiv);
  }
}

function populateCurrentNoteIntoPast(currTitle, currBody) {
  let populateTitle = currTitle
  let populateBody = currBody

  if (notesCursor == 0){
    return
  }
  let value = localStorage.getItem(COLLAPSE_FLAG_STORAGE_KEY);
      
  let collapseFlag = value === "true";

  if(!collapseFlag){
    return
  }


  const parent = document.getElementById("pastNotes");

  const noteDiv = document.createElement("div");
  noteDiv.className = "note";

  const title = document.createElement("h3");
  title.textContent = populateTitle

  const body = document.createElement("p");
  body.textContent = populateBody;

  noteDiv.appendChild(title);
  noteDiv.appendChild(body);

  parent.prepend(noteDiv);

}

function cleanTitle(title) {
  return title
    .replace(/[<>:"\/\\|?*\x00-\x1F]/g, "")
}

function hasInvalidChars(title) {
  return /[<>:"\/\\|?*\x00-\x1F]/.test(title);
}



function invalidCharChecker(){
  const titleInput = document.getElementById("fileTitleInput");
  if (hasInvalidChars(titleInput.value)){
    setStatus("Title has invalid charachters", true)
  }
  
}


function readPrefixText() {
  try {
    const value = localStorage.getItem(PREFIX_TEXT_STORAGE_KEY) || "";
    return value
  } catch (error) {
    console.error(error);
  }
}


async function loadTitleText() {
  try {
    let value = localStorage.getItem(TITLE_STORAGE_KEY) || "";
    const titleInput = document.getElementById("fileTitleInput");
    if (titleInput) {

      if(value == ""){
        value ="Untitled"
      }
      value = await replacePlaceholders(value)

      value = cleanTitle(value)

      titleInput.value = value;
    }
  } catch (error) {
    console.error(error);
  }
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

  if(hasInvalidChars(typedTitle)){
    setStatus("Title has invalid charachters", true)
    return
  }

  const authorizedHandle = await ensureStoredHandleAuthorizedWithoutPicker();
  if (!authorizedHandle) {
    return;
  }

  try {
    await createMarkdownFile(authorizedHandle, typedTitle, typedBody);
    setStatus("Created File!");

    clearNoteUi()
    purgeNoteDraft()
    populateCurrentNoteIntoPast(typedTitle, typedBody)
    loadTitleText()

    closeSidePanel();
  } catch (error) {
    console.error(error);
    setStatus("Failed to create test.md", true);
  }
}

async function onCancelClick() {
  
  clearNoteUi()
  purgeNoteDraft()
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

  let value = localStorage.getItem(COLLAPSE_FLAG_STORAGE_KEY);
      
  let flag = value === "true";

  if(!flag){
    window.close();

  }

}

async function getActiveTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    return tabs && tabs.length > 0 ? tabs[0] : null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function replacePlaceholders(template) {
  const now = new Date();
  const tab = await getActiveTab();
  const safeUrl = tab?.url || "";
  const safeTitle = tab?.title || "";

  return template.replace(/\{\{(.*?)\}\}/g, (match, inner) => {
    const key = inner.trim();

    if (key === 'url') return safeUrl || match;
    if (key === 'title') return safeTitle || match;

    try {
      return dateFns.format(now, key);
    } catch {
      return match;
    }
  });
}

async function updateFinalFileName(){
  const titleInput = document.getElementById("fileTitleInput");

  let typedTitle = titleInput ? titleInput.value : "";

  console.log("Typed title:", typedTitle);

  if(typedTitle == ""){
    typedTitle ="Untitled"
  }
  typedTitle = await replacePlaceholders(typedTitle)

  typedTitle = cleanTitle(typedTitle)

  const finalNameEl = document.getElementById("finalFileName");
  finalNameEl.textContent = typedTitle;

}

function inputDropHandler(e){

  e.preventDefault(); 


  let uri_list = e.dataTransfer.getData("text/uri-list");

  let finalLink 
  if(uri_list.length >0){

    let link = e.dataTransfer.getData("text/plain");

    let html = e.dataTransfer.getData("text/html");

    let container = document.createElement("div");
    container.innerHTML = html;

    let anchor = container.querySelector("a");

    let title = anchor?.textContent.trim() || "_titleNotFound_";

    finalLink =`[${title}](${link})\n`

  }else{

    finalLink = e.dataTransfer.getData("text/plain") + "\n";

  }



  const target = e.target;
  if (target.value !== undefined) {
    const start = target.selectionStart;
    const end = target.selectionEnd;

    target.value =
      target.value.slice(0, start) +
      finalLink +
      target.value.slice(end);

    target.selectionStart = target.selectionEnd =
      start + finalLink.length;
  }

  // console.log(e.dataTransfer.types); // shows all available formats

  // for (const type of e.dataTransfer.types) {
  //   console.log(type, e.dataTransfer.getData(type));
  // }

  // console.log("_______________________")


}


function loadNoteDraft(){

  try {
    let value = localStorage.getItem(NOTE_DRAFT_STORAGE_KEY) || "";
    const noteInput = document.getElementById("fileBodyInput");
    if (noteInput) {
      noteInput.value = value;
    }
  } catch (error) {
    console.error(error);
  }

}

function saveNoteDraft(){
  try {
    const noteInput = document.getElementById("fileBodyInput");
    const value = noteInput ? noteInput.value : "";
    localStorage.setItem(NOTE_DRAFT_STORAGE_KEY, value);
    setStatus("Note saved as a draft");
  } catch (error) {
    console.error(error);
    setStatus("Failed to save note as a draft.", true);
  }
}

function purgeNoteDraft(){
  localStorage.setItem(NOTE_DRAFT_STORAGE_KEY, "");
}

function clearNoteUi(){
  const noteInput = document.getElementById("fileBodyInput");
  noteInput.value = "";
}










function insertAtCursor(el, text) {
  const start = el.selectionStart;
  const end = el.selectionEnd;

  const before = el.value.substring(0, start);
  const after = el.value.substring(end);

  el.value = before + text + after;

  el.selectionStart = el.selectionEnd = start + text.length;
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




document.getElementById("authorizeFsBtn").addEventListener("click", authorizeFolderAccess);
document.getElementById("captureSnapshotBtn").addEventListener("click", onCaptureSnapshotClick);
document.getElementById("captureTimeStampBtn").addEventListener("click", onCaptureTimestampClick);
document.getElementById("captureAllTabsInWindowBtn").addEventListener("click", onCaptureAllTabsClick);
document.getElementById("captureThisTabBtn").addEventListener("click", onCaptureThisTabClick);
document.getElementById("retrivePastTenNotes").addEventListener("click", onRetrivePastTenNotes);
document.getElementById("placeholderBtn").addEventListener("click", onSettingsClick);
document.getElementById("confirmBtn").addEventListener("click", onConfirmClick);
document.getElementById("cancelBtn").addEventListener("click", onCancelClick);
document.getElementById("fileTitleInput").addEventListener("input", updateFinalFileName)
document.getElementById("fileTitleInput").addEventListener("input", invalidCharChecker)
document.getElementById("fileBodyInput").addEventListener("drop", inputDropHandler)
document.getElementById("fileBodyInput").addEventListener("blur", saveNoteDraft);
document.getElementById("fileBodyInput").addEventListener("keydown", bodyFormatting);

function applyTheme() {
  const isDarkMode = localStorage.getItem(DARK_MODE_FLAG_STORAGE_KEY);
  if (isDarkMode === "false") {
    document.body.classList.add("light-theme");
  } else {
    document.body.classList.remove("light-theme");
  }
}

async function initializeSidebar() {
  applyTheme();
  refreshAuthorizationStatus();
  await loadTitleText();
  loadSidebarMetadataRows();
  await updateFinalFileName();
  loadNoteDraft();
  // 🔴 THIS ALWAYS NEEDS TO BE LAST
  document.getElementById("fileBodyInput").focus();
}

initializeSidebar()
  .then(() => {
    // notify the background script that we are ready and check for any queued actions
    chrome.runtime.sendMessage({ action: "sidebarReady" }, (response) => {
      if (response && response.action === "addToNote") {
        const textarea = document.getElementById("fileBodyInput");
        if (textarea) {
          textarea.value += response.text;
        }
      }
    });
  })
  .catch((error) => {
    console.error(error);
    setStatus("Failed to initialize sidebar.", true);
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "addToNote") {
    const textarea = document.getElementById("fileBodyInput");

    if (textarea) {
      textarea.value += message.text;
    }
    sendResponse({ status: "Added highlight to sidebar" });
  }
});
