const WebSocket = require("ws");

function WebSocketClient(url, opts) {
  let client;
  let timeout;
  let connecting = false;
  let backoff = 250;

  const init = () => {
    connecting = false;
    if (client !== undefined) {
      client.removeAllListeners();
    }
    client = new WebSocket(url, opts);
    const heartbeat = () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
      }
      timeout = setTimeout(() => client.terminate(), 35000);
    };
    client.on("ping", heartbeat);
    client.on("open", (e) => {
      if (typeof this.onOpen === "function") {
        this.onOpen();
      }
      heartbeat();
    });
    client.on("message", (e) => {
      if (typeof this.onMessage === "function") {
        if (e.length > 0) {
          this.onMessage(e);
        }
      }
      heartbeat();
    });
    client.on("close", (e) => {
      if (e.code !== 1000) {
        if (connecting === false) {
          // abnormal closure
          backoff = backoff === 8000 ? 250 : backoff * 2;
          setTimeout(() => init(), backoff);
          connecting = true;
        }
      } else if (typeof this.onClose === "function") {
        this.onClose();
      }
    });
    client.on("error", (e) => {
      if (e.code === "ECONREFUSED") {
        if (connecting === false) {
          // abnormal closure
          backoff = backoff === 8000 ? 250 : backoff * 2;
          setTimeout(() => init(), backoff);
          connecting = true;
        }
      } else if (typeof this.onError === "function") {
        this.onError(e);
      }
    });
    this.send = (data) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    };
    this.on = client.on.bind(client);
    this.off = client.off.bind(client);
  };
  init();
}

module.exports = WebSocketClient;
