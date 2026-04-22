const METADATA_STORAGE_KEY = "sidenote.metadataRows";
const PREFIX_TEXT_STORAGE_KEY = "sidenote.prefixText";
const TITLE_STORAGE_KEY = "sidenote.titleText";
const COLLAPSE_FLAG_STORAGE_KEY = "sidenote.collapseFlag";

function setSaveStatus(message, isError = false) {
  const saveStatus = document.getElementById("saveStatus");
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#ff8f8f" : "#9fd59f";
}

function setPrefixSaveStatus(message, isError = false) {
  const saveStatus = document.getElementById("prefixSaveStatus");
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#ff8f8f" : "#9fd59f";
}

function setTitleSaveStatus(message, isError = false) {
  const saveStatus = document.getElementById("titleSaveStatus");
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#ff8f8f" : "#9fd59f";
}

function setCollapseFlagSaveStatus(message, isError = false) {
  const saveStatus = document.getElementById("collapseFlagSaveStatus");
  saveStatus.textContent = message;
  saveStatus.style.color = isError ? "#ff8f8f" : "#9fd59f";
}

function createMetadataRow(data = { enabled: true, key: "", value: "" }) {
  const row = document.createElement("div");
  row.className = "meta-grid meta-row";

  const checkboxWrap = document.createElement("div");
  checkboxWrap.className = "checkbox-wrap";

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.className = "meta-enabled";
  enabledInput.checked = Boolean(data.enabled);
  checkboxWrap.appendChild(enabledInput);

  const keyInput = document.createElement("input");
  keyInput.type = "text";
  keyInput.className = "meta-key";
  keyInput.placeholder = "Field";
  keyInput.value = data.key || "";

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "meta-value";
  valueInput.placeholder = "Default Value";
  valueInput.value = data.value || "";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "row-delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => {
    row.remove();
  });

  row.appendChild(checkboxWrap);
  row.appendChild(keyInput);
  row.appendChild(valueInput);
  row.appendChild(deleteBtn);

  return row;
}

function getAllRowsData() {
  const rows = Array.from(document.querySelectorAll("#metadataRows .meta-row"));
  let keyEmptyFlag = false;
  const data = rows.map((row) => {
    const enabled = row.querySelector(".meta-enabled")?.checked || false;
    const key = row.querySelector(".meta-key")?.value?.trim() || "";
    const value = row.querySelector(".meta-value")?.value || "";
    if (key === "") {
      keyEmptyFlag = true;
    }
    return { enabled, key, value };
  });
  return {
    data,
    keyEmptyFlag
  };
}

function saveMetadataRows() {
  try {
    const { data: rows, keyEmptyFlag: flag } = getAllRowsData();
    if(flag){
      setSaveStatus("Metadata key cant be empty.", true);
      return
    }
    localStorage.setItem(METADATA_STORAGE_KEY, JSON.stringify(rows));
    setSaveStatus("Metadata saved.");
  } catch (error) {
    console.error(error);
    setSaveStatus("Failed to save metadata.", true);
  }
}

function addMetadataRow() {
  const container = document.getElementById("metadataRows");
  container.appendChild(createMetadataRow());
}

function loadMetadataRows() {
  const container = document.getElementById("metadataRows");
  container.innerHTML = "";

  try {
    const raw = localStorage.getItem(METADATA_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(parsed) || parsed.length === 0) {
      container.appendChild(createMetadataRow());
      return;
    }

    parsed.forEach((item) => {
      container.appendChild(createMetadataRow(item));
    });
  } catch (error) {
    console.error(error);
    container.appendChild(createMetadataRow());
    setSaveStatus("Saved metadata was invalid. Creating a blank row.", true);
  }
}

function savePrefixText() {
  try {
    const prefixTextInput = document.getElementById("prefixTextInput");
    const value = prefixTextInput ? prefixTextInput.value : "";
    localStorage.setItem(PREFIX_TEXT_STORAGE_KEY, value);
    setPrefixSaveStatus("Prefix text saved.");
  } catch (error) {
    console.error(error);
    setPrefixSaveStatus("Failed to save prefix text.", true);
  }
}

function loadPrefixText() {
  try {
    const value = localStorage.getItem(PREFIX_TEXT_STORAGE_KEY) || "";
    const prefixTextInput = document.getElementById("prefixTextInput");
    if (prefixTextInput) {
      prefixTextInput.value = value;
    }
  } catch (error) {
    console.error(error);
    setPrefixSaveStatus("Failed to load prefix text.", true);
  }
}



function saveTitleText() {
  try {
    const titleInput = document.getElementById("titleInput");
    const value = titleInput ? titleInput.value : "";
    localStorage.setItem(TITLE_STORAGE_KEY, value);
    setTitleSaveStatus("Title saved.");
  } catch (error) {
    console.error(error);
    setTitleSaveStatus("Failed to save title.", true);
  }
}

function loadTitleText() {
  try {
    const value = localStorage.getItem(TITLE_STORAGE_KEY) || "";
    const titleInput = document.getElementById("titleInput");
    if (titleInput) {
      titleInput.value = value;
    }
  } catch (error) {
    console.error(error);
    setTitleSaveStatus("Failed to load title.", true);
  }
}




function saveCollapseFlag() {

  try {
    const collapseFlag = document.getElementById("collapseFlag");
    const value = collapseFlag ? collapseFlag.checked : false;
    localStorage.setItem(COLLAPSE_FLAG_STORAGE_KEY, value.toString());
    setCollapseFlagSaveStatus("Collapse flag saved.");
  } catch (error) {
    console.error(error);
    setCollapseFlagSaveStatus("Failed to save flag.", true);
  }
}

function loadCollapseFlag() {
  try {
    const value = localStorage.getItem(COLLAPSE_FLAG_STORAGE_KEY);
    const collapseFlag = document.getElementById("collapseFlag");
    if (collapseFlag && value !== null) {
      collapseFlag.checked = value === "true";
    }
  } catch (error) {
    console.error(error);
    setCollapseFlagSaveStatus("Failed to load flag.", true);
  }
}




document.getElementById("addMetadataRowBtn").addEventListener("click", addMetadataRow);
document.getElementById("saveMetadataBtn").addEventListener("click", saveMetadataRows);
document.getElementById("savePrefixTextBtn").addEventListener("click", savePrefixText);
document.getElementById("saveTitleTextBtn").addEventListener("click", saveTitleText);
document.getElementById("saveCollapseFlagBtn").addEventListener("click", saveCollapseFlag);

loadMetadataRows();
loadPrefixText();
loadTitleText();
loadCollapseFlag();
