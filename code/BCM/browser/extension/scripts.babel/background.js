let lastTab = null;

const ws = new WebSocketClient();

function broadcast(event) {
  ws.send(event);
}
function sendCurrentUrl() {
  return new Promise((resolve) => {
    chrome.tabs.getSelected(null, function (tab) {
      resolve(tab);
    });
  });
}

chrome.tabs.onSelectionChanged.addListener(async (tabId) => {
  lastTab = await sendCurrentUrl();
  broadcast({
    event: "tab_changed",
    tab: lastTab,
    tab_id: tabId,
  });
});

// chrome.tabs.onActivated.addListener(async function (tabId) {
//   lastTab = await sendCurrentUrl();
//   broadcast({
//     event: "tab_changed",
//     tab: lastTab,
//     tab_id: tabId,
//   });
// });

chrome.tabs.onRemoved.addListener(function (tabId) {
  broadcast({
    event: "tab_closed",
    tab_id: tabId,
  });
});

chrome.windows.onRemoved.addListener(function (tabId) {
  broadcast({
    event: "window_closed",
    tab_id: tabId,
  });
});

chrome.webRequest.onBeforeRequest.addListener(
  async function (event) {
    lastTab = await sendCurrentUrl();
    if (event.requestBody && event.requestBody.raw) {
      let formData = event.requestBody.raw;
      var res = "";
      for (i = 0; i < formData.length; i++) {
        res =
          res +
          String.fromCharCode.apply(
            null,
            new Uint8Array(event.requestBody.raw[i].bytes)
          );
      }
      if (res.length > 0 && (res[0] == "[" || res[0] == "{")) {
        try {
          res = JSON.parse(res);
        } catch (error) {
          console.error("[ERROR] parsing form data");
        }
      }
      event.requestBody = res;
    }
    event.activeTab = event.tabId == lastTab.id;
    broadcast({
      event: "request_created",
      request: event,
      current_tab: lastTab,
    });
    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

var accessControlRequestHeaders;
var exposedHeaders;

chrome.webRequest.onCompleted.addListener(
  async function (event) {
    lastTab = await sendCurrentUrl();
    event.activeTab = event.tabId == lastTab.id;
    broadcast({
      event: "request_completed",
      request: event,
      current_tab: lastTab,
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
  if (data.type != "error") {
    return true;
  }
  console.log(data, sender);
  errors[sender.tab.id].push(data.error);

  chrome.browserAction.setBadgeText({
    tabId: sender.tab.id,
    text: errors[sender.tab.id].length + "",
  });
  //chrome.storage.local.set({error: error});
  return true;
});
