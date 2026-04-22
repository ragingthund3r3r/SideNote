chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error);

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToNote",
    title: "Add selected text to note",
    contexts: ["selection"]
  });
});

let pendingAction = null;

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "addToNote") {
    const selectedText = info.selectionText;

    console.log("Selected text:", selectedText);

    // temp save the pending action
    pendingAction = {
      action: "addToNote",
      text: selectedText
    };

    await chrome.sidePanel.open({ tabId: tab.id });
    

    try {
      // trying to send if the sidebar is open
      await chrome.runtime.sendMessage(pendingAction);
      pendingAction = null;
    } catch {

    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "sidebarReady") {
    if (pendingAction) {
      // Send any queued action
      sendResponse(pendingAction);
      pendingAction = null;
    } else {
      sendResponse(null);
    }
  }
});

/**



 */