function inIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

window.parentWebsocket = null;

function WebSocketClient() {
  if (!(this instanceof WebSocketClient)) {
    if (!inIframe()) {
      return new WebSocketClient();
    }
    return window.top.parentWebsocket;
  }

  let protocol = "ws";
  if (document.location.protocol == "https:") {
    protocol += "s";
  }
  let host = "nobel.durieux.me:1189";

  const listeners = {};
  const that = this;
  window.parentWebsocket = that;

  let ws = null;
  const init = () => {
    connecting = false;
    if (ws != null) {
      for (let event in listeners) {
        for (let cb of listeners[event]) {
          ws.removeEventListener(event, cb);
        }
      }
    }
    ws = new WebSocket(protocol + "://" + host);

    ws.onclose = function (e) {
      console.log(
        "Socket is closed. Reconnect will be attempted in 0.5 second.",
        e.reason
      );
      setTimeout(init, 500);
    };

    ws.onerror = function (err) {
      console.error(
        "Socket encountered error: ",
        err.message,
        "Closing socket"
      );
      ws.close();
    };

    ws.onmessage = function (message) {
      if (typeof that.onmessage === "function") {
        if (message.data.length > 0) {
          that.onmessage(message);
        }
      }
    };
    for (let event in listeners) {
      for (let cb of listeners[event]) {
        ws.addEventListener(event, cb);
      }
    }
  };

  that.addEventListener = (event, cb) => {
    if (listeners[event] == null) {
      listeners[event] = [];
    }

    listeners[event].push(cb);
    if (ws != null) {
      ws.addEventListener(event, cb);
    }
  };
  init();
}
