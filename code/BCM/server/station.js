const express = require("express");
const bodyParser = require("body-parser");
const WebSocket = require("ws");
const http = require("http");
const cli = require("cli");

const browser = require("./lib/browser");
const tsharks = require("./lib/sharks");
const hotspot = require("./lib/hotspot");
const getIP = require("./lib/ip");
const osc = require("./lib/osc");

const config = require("config");
const oscConfig = { ...config.get("OSC") };

const options = cli.parse({
  coordinatorURL: ["c", "Coordinator URL", "string"],
  name: ["n", "Station name", "string", "SoundProxy"],
  port: ["p", "Server port", "int", config.get("station.port")],
  interface: [
    "i",
    "Sniffing interface",
    "string",
    config.get("station.interface"),
  ],
});

const app = express();
app.use(bodyParser.json());

app.get("/api/wifi/config", (req, res) => {
  res.json(hotspot.getWifiConfig());
});

app.use("/style", express.static("public/style"));
app.use("/assets", express.static("public/assets"));
app.use("/js", express.static("public/js"));
app.use("/", express.static("public/station"));
app.use("*", express.static("public/station/index.html"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

server.on("upgrade", function (request, socket, head) {
  wss.handleUpgrade(request, socket, head, function (ws) {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", function (ws, request) {
  ws.on("message", function (message) {
    const data = JSON.parse(message);
    handleMessage(stationId, data);
  });
});

const status = {
  muted: false,
  sniffing: false,
  osc: false,
};

function broadcast(data) {
  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}
function broadcastNetworkActivity(data) {
  data.station = options.name;

  wss.clients.forEach(function each(client) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          event: "networkActivity",
          data,
        })
      );
    }
  });

  if (coordinatorWS != null) {
    coordinatorWS.send(
      JSON.stringify({
        event: "networkActivity",
        data,
      })
    );
  }
  if (status.osc && !status.muted) {
    osc.send(data);
  }
}

let sniffingChild = null;
async function startSniffing(interface) {
  try {
    status.sniffing = true;
    await tsharks(
      interface,
      (b) => (sniffingChild = b),
      broadcastNetworkActivity
    );
  } catch (error) {
    console.log(error);
  }
  status.sniffing = false;
}

function stopSniffing() {
  if (sniffingChild != null) {
    sniffingChild.kill(1);
    sniffingChild = null;
  }
  status.sniffing = false;
}

function startOSC() {
  osc.open(oscConfig.ip, oscConfig.port, oscConfig.address, () => {
    console.log(
      `OSC ready to send data to ${oscConfig.ip}:${oscConfig.port}${oscConfig.address}`
    );
    status.osc = true;
  });
}

function stopOSC() {
  osc.close();
  status.osc = false;
}

let coordinatorWS = null;
async function callCoordinator(func, args) {
  return new Promise((resolve, reject) => {
    if (coordinatorWS == null || coordinatorWS.readyState !== WebSocket.OPEN) {
      reject("Coordinator is not connected");
    }
    coordinatorWS.send(
      JSON.stringify({
        event: "call",
        method: func,
        args,
      })
    );
    const cb = (data) => {
      const json = JSON.parse(data);
      if (json.event == "return" && func == json.method) {
        coordinatorWS.off("message", cb);
        if (json.error) {
          return reject(json.error);
        }
        return resolve(json.value);
      }
    };
    coordinatorWS.on("message", cb);
  });
}

const webSocketActions = {};
webSocketActions.getStatus = () => status;
webSocketActions.getAddress = () => `http://${getIP()}:${options.port}`;

webSocketActions.disconnect = async (mac) => {
  return hotspot.disconnect(mac);
};

webSocketActions.startOSC = startOSC;
webSocketActions.stopOSC = stopOSC;

webSocketActions.stopSniffing = stopSniffing;
webSocketActions.startSniffing = () => startSniffing(options.interface);

webSocketActions.playPacket = (packet) => {
  broadcastNetworkActivity(packet);
};

webSocketActions.openBrowser = () =>
  browser.open(`http://localhost:${options.port}`);
webSocketActions.closeBrowser = browser.close;

webSocketActions.setConfig = (args) => {
  config = args;
};
webSocketActions.mute = () => (status.muted = true);
webSocketActions.resume = () => (status.muted = false);

webSocketActions.instruction = (args) => {
  broadcast({
    event: "instruction",
    instruction: args,
  });
};

function handleMessage(json) {
  if (json.event == "call") {
    let value = null;
    let error = null;
    try {
      value = webSocketActions[json.method](json.args);
    } catch (e) {
      error = e.message;
    }
    coordinatorWS.send(
      JSON.stringify({
        event: "return",
        method: json.method,
        value,
        error,
      })
    );
  }
}
function connectToCoordinator(coordinatorURL) {
  coordinatorWS = new WebSocket(coordinatorURL, {
    headers: { "station-id": options.name },
    perMessageDeflate: false,
  });
  coordinatorWS.on("open", async () => {
    console.log("Connected to Coordinator " + coordinatorURL);
    config = await callCoordinator("getConfig");
  });
  coordinatorWS.on("message", (data) => {
    const json = JSON.parse(data);
    handleMessage(json);
  });
  coordinatorWS.on("error", function (err) {
    console.log("error", err);
  });
  coordinatorWS.on("close", function () {
    console.log("Connection lost with coordinator");
    setTimeout(() => {
      connectToCoordinator(coordinatorURL);
    }, 1000);
  });
}

let coordinatorURL = options.coordinatorURL;
if (options.coordinatorURL == null) {
  require("./coordinator").start();
  coordinatorURL = "ws://localhost:8000";
} else {
  coordinatorURL = options.coordinatorURL;
}

let wasAlive = false;
let isHotspot = hotspot.isHotspot();
async function isAlive() {
  const connectedUsers = await hotspot.connectedUsers(options.interface);
  try {
    callCoordinator("setConnectedUsers", connectedUsers);
    const alive = isHotspot ? connectedUsers.length > 0 : true;
    let deviceName = "BCM-Phone";
    if (alive) {
      deviceName = connectedUsers[0].name;
    }
    if (alive == false && wasAlive == true) {
      broadcast({
        event: "reset",
      });
    }
    wasAlive = alive;
    broadcast({
      event: "alive",
      alive,
      deviceName,
    });
  } catch (error) {
    console.log(error.message);
  }
  setTimeout(() => {
    isAlive();
  }, 1000);
}
server.listen(options.port, function () {
  console.log(`Start Station ${options.name} on port ${options.port}`);
  connectToCoordinator(coordinatorURL);
  startSniffing(options.interface);
  startOSC();

  isAlive();
});
