const express = require("express");
const bodyParser = require("body-parser");
const fastJson = require("fast-json-stringify");
const http = require("http");
const cli = require("cli");

const browser = require("./lib/browser");
const tsharks = require("./lib/sharks");
const hotspot = require("./lib/hotspot");
const getIP = require("./lib/ip");
const osc = require("./lib/osc");
const WSClient = require("./lib/WSClient");
const WSServer = require("./lib/WSServer");

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
const wss = WSServer(server);

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

const networkActivitySchema = fastJson({
  title: "networkActivity Schema",
  type: "object",
  properties: {
    event: { type: "string" },
    data: {
      type: "object",
      properties: {
        id: { type: "integer" },
        timestamp: { type: "integer" },
        len: { type: "integer" },
        info: { type: "string" },
        protocol: { type: "string" },
        out: { type: "boolean" },
        local_ip: { type: "string" },
        remote_ip: { type: "string" },
        local_host: { type: "string" },
        remote_host: { type: "string" },
        local_mac: { type: "string" },
        remote_mac: { type: "string" },
        local_vender: { type: "string" },
        remote_vender: { type: "string" },
        local_vender: { type: "string" },
        local_location: {
          type: "object",
          properties: {
            country: { type: "string" },
            continent: { type: "string" },
          },
        },
        remote_location: {
          type: "object",
          properties: {
            country: { type: "string" },
            continent: { type: "string" },
          },
        },
        services: { type: "array" },
        station: { type: "string" },
      },
    },
  },
});

function broadcastNetworkActivity(data) {
  data.station = options.name;
  if (status.osc && !status.muted) {
    osc.send(data);
  }
  const str = networkActivitySchema({
    event: "networkActivity",
    data,
  });
  wss.broadcast(str);

  if (coordinatorWS != null) {
    coordinatorWS.send(str, { binary: false }, () => {});
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
    if (coordinatorWS == null) {
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
      if (data.length == 0) {
        return;
      }
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

webSocketActions.playPacket = broadcastNetworkActivity;

webSocketActions.openBrowser = () =>
  browser.open(`http://localhost:${options.port}`);
webSocketActions.closeBrowser = browser.close;

webSocketActions.setConfig = (args) => {
  config = args;
};
webSocketActions.mute = () => (status.muted = true);
webSocketActions.resume = () => (status.muted = false);

webSocketActions.instruction = (args) => {
  wss.broadcast({
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
  coordinatorWS = new WSClient(coordinatorURL, {
    headers: { "station-id": options.name },
  });
  coordinatorWS.onOpen = async () => {
    console.log(
      `[coordinatorWS] [INFO] Connected to Coordinator ${coordinatorURL}`
    );
    config = await callCoordinator("getConfig");
  };
  coordinatorWS.onMessage = (data) => handleMessage(JSON.parse(data));

  coordinatorWS.onError = (err) =>
    console.error(`[coordinatorWS] [ERROR] ${err}`);
  coordinatorWS.onError = (err) =>
    console.error(`[coordinatorWS] [ERROR] ${err}`);
  coordinatorWS.onClose = () => {
    console.error(`[coordinatorWS] [ERROR] Connection lost with coordinator`);
  };
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
    if (connectedUsers.length > 0) {
      deviceName = connectedUsers[0].name;
    }
    if (alive == false && wasAlive == true) {
      wss.broadcast({
        event: "reset",
      });
    }
    wasAlive = alive;
    wss.broadcast({
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
