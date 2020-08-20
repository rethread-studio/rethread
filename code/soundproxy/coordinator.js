const WebSocket = require("ws");
const http = require("http");
const config = require("config");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
app.use("/style", express.static("public/style"));
app.use("/assets", express.static("public/assets"));
app.use("/js", express.static("public/js"));
app.use("/", express.static("public/coordinator"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });
const clients = {};

server.on("upgrade", function (request, socket, head) {
  wss.handleUpgrade(request, socket, head, function (ws) {
    wss.emit("connection", ws, request);
  });
});

const webSocketActions = {};
webSocketActions.getConfig = (args) => {
  return config;
};
function handleMessage(from, json) {
  if (json.event == "call") {
    let value = null;
    let error = null;
    try {
      value = webSocketActions[json.method](json.args);
    } catch (e) {
      error = e.message;
    }
    clients[from].send(
      JSON.stringify({
        event: "return",
        method: json.method,
        value,
        error,
      })
    );
  } else if (json.event == "networkActivity") {
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN && !client.stationId) {
        client.send(JSON.stringify(json));
      }
    });
  }
}
async function callStation(station, func, args) {
  return new Promise((resolve, reject) => {
    clients[station].send(
      JSON.stringify({
        event: "call",
        method: func,
        args,
      })
    );
    const cb = (data) => {
      const json = JSON.parse(data);
      if (json.event == "return" && func == json.method) {
        clients[station].off("message", cb);
        if (json.error) {
          return reject(json.error);
        }
        return resolve(json.value);
      }
    };
    clients[station].on("message", cb);
  });
}

wss.on("connection", async function (ws, request) {
  ws.stationId = request.headers["station-id"];
  if (ws.stationId) {
    if (clients[ws.stationId]) {
      clients[ws.stationId].close();
      console.log(`Station '${ws.stationId}' reconnected`);
    } else {
      console.log(`New station '${ws.stationId}' connected`);
    }
    clients[ws.stationId] = ws;
    console.log(await callStation(ws.stationId, "getStatus"));
  }

  ws.on("message", function (message) {
    const data = JSON.parse(message);
    handleMessage(ws.stationId, data);
  });
});

app.post("/api/instruction", function (req, res) {
  console.log(req.body);
  for (let station in clients) {
    callStation(station, "instruction", req.body.instruction);
  }
  res.json("ok");
});

app.get("/api/stations", function (req, res) {
  res.json(Object.keys(clients));
});

app.get("/api/station/:station/status", async (req, res) => {
  const status = await callStation(req.params.station, "getStatus");
  res.json(status);
});

function start() {
  server.listen(config.get("coordinator.port"), function () {
    console.log("Start Coordinator on port " + config.get("coordinator.port"));
  });
}

if (!module.parent) {
  start();
} else {
  module.exports.start = start;
}
