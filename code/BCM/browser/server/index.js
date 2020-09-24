const geoip = require("geoip-lite");
const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const URL = require("url");
const cli = require("cli");

const WSServer = require("./WSServer");
const services = require("./services");
const osc = require("./osc");

const options = cli.parse({
  oscAddress: ["h", "OSC address", "string", "127.0.0.1"],
  oscPort: ["p", "OSC port", "int", 57130],
});

const app = express();
app.use(bodyParser.json());
app.use("/", express.static("public/"));

osc.open(options.oscAddress, options.oscPort, "/request_completed", () => {});

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
    if (message.request) {
      if (message.request.responseHeaders) {
        const headers = {};
        for (let h of message.request.responseHeaders) {
          headers[h.name] = h.value;
        }
        message.request.responseHeaders = headers;
        if (message.request.responseHeaders["content-type"]) {
          message.request.content_type =
            message.request.responseHeaders["content-type"];
        }
        if (message.request.responseHeaders["content-length"]) {
          message.request.content_length = parseInt(
            message.request.responseHeaders["content-length"]
          );
        }
      }
      osc.send(message.request, message.event);
    }
    wss.broadcast(message, ws);
  });
});

server.listen(8873, function () {
  console.log(`Browser extension request listener on port 8873`);
});
