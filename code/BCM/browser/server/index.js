const geoip = require("geoip-lite");
const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");

const WSServer = require("./WSServer");

const app = express();
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = WSServer(server);

wss.on("connection", function (ws, request) {
  ws.on("message", function (message) {
    message = JSON.parse(message);
    if (message.request && message.request.ip) {
      try {
        message.request.location = geoip.lookup(message.request.ip) 
      } catch (error) {
        console.error("[ERROR] unable to localize the ip " + message.request.ip)
      }
    }
    wss.broadcast(message, ws);
  });
});

server.listen(8873, function () {
  console.log(`Browser extension request listener on port 8873`);
});
