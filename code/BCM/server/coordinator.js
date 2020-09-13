const fs = require("fs");
const WebSocket = require("ws");
const http = require("http");
const config = require("config");

const osc = require("./lib/osc");
const getIP = require("./lib/ip");

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
webSocketActions.getConfig = (from, args) => {
  return config;
};

webSocketActions.setConnectedUsers = (from, args) => {
  stations[from].clients = args;
};

function handleMessage(from, json, raw) {
  if (!stations[from]) {
    return;
  }
  if (json.event == "call") {
    let value = null;
    let error = null;
    try {
      value = webSocketActions[json.method](from, json.args);
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
        client.send(raw);
      }
    });
  }
}
async function callStation(station, func, args, expectReturn = true) {
  return new Promise((resolve, reject) => {
    if (
      !stations[station] ||
      stations[station].ws.readyState !== WebSocket.OPEN
    ) {
      return reject(`Station '${station}' does not exists`);
    }
    stations[station].ws.send(
      JSON.stringify({
        event: "call",
        method: func,
        args,
      })
    );
    let timeoutId = null;
    const cb = (data) => {
      const json = JSON.parse(data);
      if (json.event == "return" && func == json.method) {
        clearTimeout(timeoutId);
        stations[station].ws.off("message", cb);
        if (json.error) {
          return reject(json.error);
        }
        return resolve(json.value);
      }
    };
    if (expectReturn) {
      stations[station].ws.on("message", cb);
      timeoutId = setTimeout(() => {
        stations[station].ws.off("message", cb);
        reject("Timeout getting answer");
      }, 5000);
    } else {
      return resolve();
    }
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
    handleMessage(ws.stationId, data, message);
  });
});

let samples = [];
if (fs.existsSync(__dirname + "/data/samples.json")) {
  samples = JSON.parse(fs.readFileSync(__dirname + "/data/samples.json"));
}

async function sendMessage(m, station, time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (stations[station]) {
        callStation(station, "playPacket", m, false);
      } else {
        osc.send(m);
      }
      return resolve();
    }, time);
  });
}

let playingSample = null;
async function playSample(sample) {
  if (playingSample == null || sample == null) {
    return;
  }
  for (let i = 0; playingSample && i < playingSample.messages.length; i++) {
    if (playingSample == null || status.play == false) {
      return;
    }
    const m = playingSample.messages[i];
    let station = m.station ? m.station : m.speaker;
    if (sample.stations[station]) {
      if (sample.stations[station].map) {
        station = sample.stations[station].map;
      }
    }
    if (!station) {
      continue;
    }
    let diff = 10;
    if (i > 0) {
      diff = m.timestamp - playingSample.messages[i - 1].timestamp;
    }

    await sendMessage(m, station, diff);
  }
  playSample(sample);
}

function stopSample() {
  status.play = false;
  playingSample = null;
}

app.get("/api/samples", function (req, res) {
  res.json(samples);
});

app.get("/api/sample/:sample", function (req, res) {
  const output = {
    name: req.params.sample,
    stations: {},
  };
  const sample = JSON.parse(
    fs.readFileSync(__dirname + "/data/samples/" + req.params.sample + ".json")
  );
  for (let packet of sample.messages) {
    let station = packet.station;
    if (!station) {
      station = packet.speaker;
    }
    if (!output.stations[station]) {
      output.stations[station] = {
        name: station,
        metrics: {
          in: 0,
          out: 0,
          lenIn: 0,
          lenOut: 0,
        },
      };
    }

    if (packet.out) {
      output.stations[station].metrics.out++;
      output.stations[station].metrics.lenOut += packet.len;
    } else {
      output.stations[station].metrics.in++;
      output.stations[station].metrics.lenIn += packet.len;
    }
  }
  res.json(output);
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
          fs.readFileSync(
            __dirname + "/data/samples/" + data.sample.name + ".json"
          )
        );
        setTimeout(() => {
          playSample(data.sample);
        }, 100);
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

app.get("/api/stations", async function (req, res) {
  const output = {};
  for (let stationId in stations) {
    const status = await callStation(stationId, "getStatus");
    stations[stationId].status = status;

    output[stationId] = {
      name: stationId,
      address: stations[stationId].address,
      metrics: stations[stationId].metrics,
      status: stations[stationId].status,
      clients: stations[stationId].clients,
    };
  }
  res.json(output);
});

app.get("/api/station/:station/status", async (req, res) => {
  const status = await callStation(req.params.station, "getStatus");
  stations[req.params.station].status = status;
  res.json({
    name: req.params.station,
    address: stations[req.params.station].address,
    metrics: stations[req.params.station].metrics,
    clients: stations[req.params.station].clients,
    status: status,
  });
});

app.post("/api/station/:station/disconnect", async (req, res) => {
  res.json(await callStation(req.params.station, "disconnect", req.body.mac));
});

app.post("/api/station/:station/openbrowser", async (req, res) => {
  res.json(await callStation(req.params.station, "openBrowser"));
});

app.post("/api/station/:station/closebrowser", async (req, res) => {
  res.json(await callStation(req.params.station, "closeBrowser"));
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
    console.log(
      "Start Coordinator: ws://" +
        getIP() +
        ":" +
        config.get("coordinator.port")
    );
  });
}

if (!module.parent) {
  start();
} else {
  module.exports.start = start;
}
