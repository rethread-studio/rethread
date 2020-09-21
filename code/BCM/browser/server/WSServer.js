const { clearAll } = require("gulp-cache");
const WebSocket = require("ws");

module.exports = (server) => {
  function noop() {}

  function heartbeat() {
    this.isAlive = true;
  }

  const wss = new WebSocket.Server({ noServer: true });
  server.on("upgrade", function (request, socket, head) {
    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", function connection(ws, request) {
    ws.isAlive = true;
    ws.on("pong", heartbeat);
  });

  wss.broadcast = (data, origin) => {
    if (typeof data != "string") {
      data = JSON.stringify(data);
    }
    wss.clients.forEach(function each(client) {
      if (client != wss && client != origin && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping(noop);
    });
  }, 30000);

  wss.on("close", function close() {
    clearInterval(interval);
  });

  return wss;
};