const fs = require("fs");
const WebSocket = require("ws");
const http = require("http");
const config = require("config");

const osc = require("./lib/osc");

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
const stations = {};
const status = {};

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
    stations[from].ws.send(
      JSON.stringify({
        event: "return",
        method: json.method,
        value,
        error,
      })
    );
  } else if (json.event == "networkActivity") {
    if (json.data.out) {
      stations[from].metrics.out++;
      stations[from].metrics.lenOut += json.data.len;
    } else {
      stations[from].metrics.in++;
      stations[from].metrics.lenIn += json.data.len;
    }
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN && !client.stationId) {
        client.send(JSON.stringify(json));
      }
    });
  }
}
async function callStation(station, func, args) {
  return new Promise((resolve, reject) => {
    if (!stations[station]) {
      return reject(`Station '${station}' does not exists`);
    }
    stations[station].ws.send(
      JSON.stringify({
        event: "call",
        method: func,
        args,
      })
    );
    const cb = (data) => {
      const json = JSON.parse(data);
      if (json.event == "return" && func == json.method) {
        stations[station].ws.off("message", cb);
        if (json.error) {
          return reject(json.error);
        }
        return resolve(json.value);
      }
    };
    stations[station].ws.on("message", cb);
  });
}

wss.on("connection", async function (ws, request) {
  ws.stationId = request.headers["station-id"];
  if (ws.stationId) {
    if (stations[ws.stationId]) {
      stations[ws.stationId].ws.close();
      console.log(`Station '${ws.stationId}' reconnected`);
    } else {
      console.log(`New station '${ws.stationId}' connected`);
    }
    stations[ws.stationId] = {
      ws,
      metrics: {
        since: new Date(),
        in: 0,
        out: 0,
        lenIn: 0,
        lenOut: 0,
      },
    };
    stations[ws.stationId].address = await callStation(
      ws.stationId,
      "getAddress"
    );
    stations[ws.stationId].status = await callStation(
      ws.stationId,
      "getStatus"
    );
  }

  ws.on("message", function (message) {
    const data = JSON.parse(message);
    handleMessage(ws.stationId, data);
  });
});

let samples = [];
if (fs.existsSync(__dirname + "/data/samples.json")) {
  samples = JSON.parse(fs.readFileSync(__dirname + "/data/samples.json"));
}

async function sendMessage(m, time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      osc.send(m);
      return resolve();
    }, time);
  });
}

let playingSample = null;
async function playSample() {
  if (playingSample == null) {
    return;
  }
  for (let i = 0; playingSample && i < playingSample.messages.length; i++) {
    if (playingSample == null || status.play == false) {
      return;
    }
    const m = playingSample.messages[i];
    let diff = 10;
    if (i > 0) {
      diff = m.timestamp - playingSample.messages[i - 1].timestamp;
    }
    await sendMessage(m, diff);
  }
  playSample();
}

function stopSample() {
  status.play = false;
  playingSample = null;
}

app.get("/api/samples", function (req, res) {
  res.json(samples);
});

let currentSample = null;
app.post("/api/sample/record", function (req, res) {
  if (status.record == false) {
    status.record = true;
    currentSample = {
      name: req.body.name,
      messages: [],
    };
    res.send("ok");
  } else {
    res.send("ko").status(500);
  }
});

app.post("/api/sample/save", function (req, res) {
  if (status.record !== false) {
    status.record = false;
    __dirname + "/data/samples.json";
    fs.writeFileSync(
      __dirname + "/data/samples/" + currentSample.name + ".json",
      JSON.stringify(currentSample)
    );
    samples.push(currentSample.name);
    currentSample = null;
    saveConfig();
    res.send("ok");
  } else {
    res.send("ko").status(500);
  }
});

app.post("/api/sample/stop", function (req, res) {
  osc.close();
  stopSample();
  res.send("ok");
});

app.post("/api/sample/play", async function (req, res) {
  status.play = true;
  try {
    const data = req.body;

    const oscConfig = { ...config.get("OSC") };
    osc.open(oscConfig.ip, oscConfig.port, oscConfig.address, async () => {
      for (let station in stations) {
        await callStation(station, "stopSniffing");
      }
      try {
        playingSample = JSON.parse(
          fs.readFileSync(__dirname + "/data/samples/" + data.sample + ".json")
        );
        setTimeout(playSample, 100);
      } catch (error) {
        status.play = false;
        console.log(error);
      }
    });
  } catch (error) {
    status.play = false;
    console.log(error);
  }
  res.send("ok");
});

app.post("/api/instruction", function (req, res) {
  for (let station in stations) {
    callStation(station, "instruction", req.body.instruction);
  }
  res.json("ok");
});

app.get("/api/stations", function (req, res) {
  const output = {};
  for (let stationId in stations) {
    output[stationId] = {
      name: stationId,
      address: stations[stationId].address,
      metrics: stations[stationId].metrics,
      status: stations[stationId].status,
    };
  }
  res.json(output);
});

app.get("/api/station/:station/status", async (req, res) => {
  const status = await callStation(req.params.station, "getStatus");
  res.json({
    name: req.params.station,
    address: stations[req.params.station].address,
    metrics: stations[req.params.station].metrics,
    status: status,
  });
});

app.post("/api/station/:station/toggleosc", async (req, res) => {
  const status = await callStation(req.params.station, "getStatus");
  if (status.osc) {
    await callStation(req.params.station, "stopOSC");
  } else {
    await callStation(req.params.station, "startOSC");
  }

  res.json(await callStation(req.params.station, "getStatus"));
});

app.post("/api/station/:station/togglemute", async (req, res) => {
  const status = await callStation(req.params.station, "getStatus");
  if (status.muted) {
    await callStation(req.params.station, "resume");
  } else {
    await callStation(req.params.station, "mute");
  }

  res.json(await callStation(req.params.station, "getStatus"));
});

app.post("/api/station/:station/togglesniffing", async (req, res) => {
  const status = await callStation(req.params.station, "getStatus");
  if (status.sniffing) {
    await callStation(req.params.station, "stopSniffing");
  } else {
    await callStation(req.params.station, "startSniffing");
  }

  res.json(await callStation(req.params.station, "getStatus"));
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
