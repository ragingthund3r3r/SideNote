const METADATA_STORAGE_KEY = "sidenote.metadataRows";
const PREFIX_TEXT_STORAGE_KEY = "sidenote.prefixText";

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

  return rows.map((row) => {
    const enabled = row.querySelector(".meta-enabled")?.checked || false;
    const key = row.querySelector(".meta-key")?.value?.trim() || "";
    const value = row.querySelector(".meta-value")?.value || "";

    return { enabled, key, value };
  });
}

function saveMetadataRows() {
  try {
    const rows = getAllRowsData();
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

document.getElementById("addMetadataRowBtn").addEventListener("click", addMetadataRow);
document.getElementById("saveMetadataBtn").addEventListener("click", saveMetadataRows);
document.getElementById("savePrefixTextBtn").addEventListener("click", savePrefixText);

loadMetadataRows();
loadPrefixText();
