const geoip = require("geoip-lite");
const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const URL = require("url");

const WSServer = require("./WSServer");
const services = require("./services");

const app = express();
app.use(bodyParser.json());
app.use("/", express.static("public/"));

const server = http.createServer(app);
const wss = WSServer(server);

wss.on("connection", function (ws, request) {
  ws.on("message", function (message) {
    message = JSON.parse(message);
    if (message.request) {
      if (message.request.url) {
        message.request.hostname = URL.parse(message.request.url).hostname;
        message.request.services = services(message.request);
      }
      if (message.request.ip) {
        try {
          message.request.location = geoip.lookup(message.request.ip);
        } catch (error) {
          console.error(
            "[ERROR] unable to localize the ip " + message.request.ip
          );
        }
      }
    }
    console.log(message);
    wss.broadcast(message, ws);
  });
});

server.listen(8873, function () {
  console.log(`Browser extension request listener on port 8873`);
});
