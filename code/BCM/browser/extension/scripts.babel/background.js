let lastTabId = -1;

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
  lastTabId = tabId;
  broadcast({
    event: "tab_changed",
    tab: await sendCurrentUrl(),
    tab_id: tabId,
  });
});

chrome.tabs.onActivated.addListener(async function (tabId) {
  lastTabId = tabId;
  broadcast({
    event: "tab_changed",
    tab: await sendCurrentUrl(),
    tab_id: tabId,
  });
});

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
  function (event) {
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
    broadcast({
      event: "request_created",
      request: event,
    });
    return { cancel: false };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestBody"]
);

var accessControlRequestHeaders;
var exposedHeaders;

chrome.webRequest.onCompleted.addListener(
  function (event) {
    broadcast({
      event: "request_conpleted",
      request: event,
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
