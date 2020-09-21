function WebSocketClient() {
  if (!(this instanceof WebSocketClient)) {
    return new WebSocketClient();
  }

  const host = "ws://localhost:8873";

  const listeners = {};
  const that = this;

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
    ws = new WebSocket(host);

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
  that.send = function (message) {
    if (ws != null) {
      if (typeof message != "string") {
        message = JSON.stringify(message);
      }
      ws.send(message);
    }
  };
  init();
}
