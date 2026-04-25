const TOAST_FLAG_STORAGE_KEY = "sidenote.toastFlag";


(function () {
  const STYLE_ID = "myext-toast-styles";

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
    .myext-toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647;
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 280px;
    }

    .myext-toast {
    background: rgba(20, 20, 20, 0.92);
    color: #fff;
    padding: 12px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-family: system-ui, sans-serif;

    display: flex;
    flex-direction: column;
    gap: 10px;

    opacity: 0;
    transform: translateY(16px) scale(0.98);
    transition: opacity 0.28s ease, transform 0.28s ease;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
    backdrop-filter: blur(6px);
    }

    .myext-toast.myext-show {
    opacity: 1;
    transform: translateY(0) scale(1);
    }

    .myext-toast-text {
    line-height: 1.4;
    word-wrap: break-word;
    }

    .myext-toast-actions {
    display: flex;
    justify-content: space-evenly;

    }

    .myext-btn {
    background: #4f7cff;
    border: none;
    color: white;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
    }

    .myext-btn:hover {
    background: #3f6df0;
    }

    .myext-btn:active {
    transform: scale(0.96);
    }
    `;
    document.head.appendChild(style);
  }

  function getContainer() {
    let container = document.querySelector(".myext-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "myext-toast-container";
      document.body.appendChild(container);
    }
    return container;
  }

function createToast() {
  const toast = document.createElement("div");
  toast.className = "myext-toast";

  const text = document.createElement("div");
  text.className = "myext-toast-text";
  text.textContent = "Hey!\n\n Its been an hour since you have logged anything. \n\n Still on track or do you want to log your status?";

  const actions = document.createElement("div");
  actions.className = "myext-toast-actions";

  const button = document.createElement("button");
  button.className = "myext-btn";
  button.textContent = "Open SideNote";

  button.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openSidePanel" });
  });

  actions.appendChild(button);

  const button2 = document.createElement("button");
  button2.className = "myext-btn";
  button2.textContent = "Dismiss";

  button2.addEventListener("click", () => {
    setTimeout(() => {
        toast.classList.remove("myext-show");
        setTimeout(() => toast.remove(), 300);
    }, 200);
  });

  actions.appendChild(button2);
  
  toast.appendChild(text);
  toast.appendChild(actions);

  const container = getContainer();
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("myext-show");
  });

  setTimeout(() => {
    toast.classList.remove("myext-show");
    setTimeout(() => toast.remove(), 300);
  }, 30000);
}

setInterval(() => {
  chrome.storage.local.get(["toastFlag"], (result) => {
  

    if (!result.toastFlag) {
      createToast();
    }
  });
// }, 10000);
// }, 40000);
}, 3600000);

})();