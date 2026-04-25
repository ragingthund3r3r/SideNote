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
  if (message.action === "captureVisibleViewport") {
    (async () => {
      try {
        const lastFocusedWindow = await chrome.windows.getLastFocused();
        const pngDataUrl = await chrome.tabs.captureVisibleTab(lastFocusedWindow.id, { format: "png" });
        sendResponse({ ok: true, dataUrl: pngDataUrl });
      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: error?.message || "Unable to capture visible viewport." });
      }
    })();

    return true;
  }

  if (message.action === "sidebarReady") {
    if (pendingAction) {
      // Send any queued action
      sendResponse(pendingAction);
      pendingAction = null;
    } else {
      sendResponse(null);
    }
  }

  if (message.action === "captureTimestamp"){
  (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const url = tab.url;
      console.log(url)

      if (!url || !url.startsWith("https://www.youtube.com/")) {

        sendResponse({ ok: false, error: "Invalid or unsupported URL" });
        return;
      }

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {

          const el = document.querySelector(".ytp-time-current");

          if (!el) return null;
          return {
            text: el.innerText
          };
        }
      });

      let element = results[0].result;

      element = element
        ? { url, ...element }
        : null;

      if (!element) {
        sendResponse({ ok: false, error: "Element not found" });
        return;
      }

      sendResponse({ ok: true, element });

    } catch (error) {
      console.error(error);
      sendResponse({ ok: false, error: error?.message || "Failed to extract element." });
    }
  })();

  return true;

  }

  if (message.action === "openSidePanel") {
    if (sender.tab && sender.tab.id !== undefined) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
    }
  }

  if (message.action === "captureAllTabs"){
    (async () => {
      try {

        const tabs = await chrome.tabs.query({ currentWindow: true });

        const tabData = tabs.map(tab => ({
          title: tab.title,
          url: tab.url
        }));

        sendResponse({ tabData });

      } catch (error) {
        console.error(error);
        sendResponse({ ok: false, error: error?.message || "Failed to extract tabs." });
      }
    })();

    return true;

  }
  
});




/**



 */