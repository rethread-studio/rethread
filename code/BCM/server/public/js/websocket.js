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
  let host = document.location.hostname;
  if (document.location.port) {
    host += ":" + document.location.port;
  }

  const that = this;
  window.parentWebsocket = that;

  const init = () => {
    connecting = false;
    const ws = new WebSocket(protocol + "://" + host);
    
    ws.onclose = function (e) {
      console.log(
        "Socket is closed. Reconnect will be attempted in 1 second.",
        e.reason
      );
      setTimeout(init, 1000);
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
    that.addEventListener = ws.addEventListener.bind(ws);
  };
  init();
}
