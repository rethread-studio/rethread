let lastTab = null;

chrome.storage.local.get(bcm_config, function (items) {
  bcm_config = items;
  ws = new WebSocketClient();
});

chrome.storage.onChanged.addListener(function (changes, namespace) {
  chrome.storage.local.get(bcm_config, function (items) {
    bcm_config = items;
    if (ws) {
      ws.close();
    }
    ws = new WebSocketClient();
  });
});

let ws = null;

function broadcast(event) {
  if (ws) {
    ws.send(event);
  }
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
  if (bcm_config.reload) {
    chrome.tabs.reload(tabId);
  }
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
    if (
      event.initiator == null ||
      event.initiator.indexOf("chrome-extension") == 0 ||
      event.url.indexOf("chrome-extension") == 0  ||
      event.url.indexOf("127.0.0.1") != -1
    ) {
      return {
        cancel: false,
      };
    }
    if (event.type == "main_frame") {
      ga("send", "pageview", event.url);
    }
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
    ga("send", "event", "request_created", event.type, event.url);
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
    if (
      event.initiator == null ||
      event.initiator.indexOf("chrome-extension") == 0 ||
      event.url.indexOf("chrome-extension") == 0 ||
      event.url.indexOf("127.0.0.1") != -1
    ) {
      return;
    }
    lastTab = await sendCurrentUrl();
    event.activeTab = event.tabId == lastTab.id;
    ga("send", "event", "request_completed", event.type, event.url);
    broadcast({
      event: "request_completed",
      request: event,
      current_tab: lastTab,
    });
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders", "extraHeaders"]
);

async function inactive() {
  chrome.tabs.getAllInWindow(null, (tabs) => {
    tabs = tabs.filter((tab) => tab.id > -1);
    const indexes = [];
    for (let tab of tabs) {
      indexes.push(tab.id);
    }
    chrome.tabs.create({
      url: chrome.extension.getURL("button.html"),
    });
    if (bcm_config.closeTabs) {
      chrome.tabs.remove(indexes);
    }
    if (bcm_config.cache) {
      chrome.browsingData.remove(
        {},
        {
          appcache: true,
          cache: true,
          cacheStorage: true,
          cookies: true,
          downloads: true,
          fileSystems: true,
          formData: true,
          history: true,
          indexedDB: true,
          localStorage: true,
          pluginData: true,
          passwords: true,
          serviceWorkers: true,
          webSQL: true,
        },
        function () {}
      );
    }
  });
}

ga("create", "UA-5954162-29", "auto");
ga("set", "checkProtocolTask", null);

var actionTimeout = null;
var isInactive = true;
broadcast({
  event: "idle",
  action: "active",
});
function action() {
  clearTimeout(actionTimeout);
  if (isInactive) {
    broadcast({
      event: "idle",
      action: "active",
    });
    ga("send", "event", "idle", "active");
  }
  isInactive = false;
  actionTimeout = setTimeout(function () {
    isInactive = true;
    inactive();
    broadcast({
      event: "idle",
      action: "inactive",
    });
    ga("send", "pageview", "home");
    ga("send", "event", "idle", "inactive");
  }, bcm_config.idle * 1000);
}
action();

chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
  if (data.type == "action") {
    action();
  } else if (data.type == "home") {
    ga("send", "pageview", "/home");
    broadcast({
      event: "home",
      action: data.action,
    });
  } else {
    console.log(data);
  }
  return true;
});
