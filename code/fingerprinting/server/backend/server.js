const http = require("http");
const WebSocket = require("ws");
const proxy = require('express-http-proxy');
const bodyParser = require("body-parser");
const methodOverride = require("method-override");
const ObjectId = require("mongodb").ObjectId;
const MongoClient = require("mongodb").MongoClient;

const URL_DB = "mongodb://mongo:27017";
const DB_NAME = "fp";

const client = new MongoClient(URL_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect();

const emojis = [
  "😂",
  "❤️",
  "😍",
  "🤣",
  "😊",
  "🙏",
  "💕",
  "😭",
  "😘",
  "👍",
  "😅",
  "👏",
  "😁",
  "♥️",
  "🔥",
  "💔",
  "💖",
  "💙",
  "😢",
  "🤔",
  "😆",
  "🙄",
  "💪",
  "😉",
  "☺️",
  "👌",
  "🤗",
  "💜",
  "😔",
  "😎",
  "😇",
  "🌹",
  "🤦",
  "🎉",
  "‼️",
  "💞",
  "✌️",
  "✨",
  "🤷",
  "😱",
  "😌",
  "🌸",
  "🙌",
  "😋",
  "💗",
  "💚",
  "😏",
  "💛",
  "🙂",
  "💓",
  "🤩",
  "😄",
  "😀",
  "🖤",
  "😃",
  "💯",
  "🙈",
  "👇",
  "🎶",
  "😒",
  "🤭",
  "❣️",
  "❗",
  "😜",
  "💋",
  "👀",
  "😪",
  "😑",
  "💥",
  "🙋",
  "😞",
  "😩",
  "😡",
  "🤪",
  "👊",
  "☀️",
  "😥",
  "🤤",
  "👉",
  "💃",
  "😳",
  "✋",
  "😚",
  "😝",
  "😴",
  "🌟",
  "😬",
  "🙃",
  "🍀",
  "🌷",
  "😻",
  "😓",
  "⭐",
  "✅",
  "🌈",
  "😈",
  "🤘",
  "💦",
  "✔️",
  "😣",
  "🏃",
  "💐",
  "☹️",
  "🎊",
  "💘",
  "😠",
  "☝️",
  "😕",
  "🌺",
  "🎂",
  "🌻",
  "😐",
  "💝",
  "🙊",
  "😹",
  "🗣️",
  "💫",
  "💀",
  "👑",
  "🎵",
  "🤞",
  "😛",
  "🔴",
  "😤",
  "🌼",
  "😫",
  "⚽",
  "🤙",
  "☕",
  "🏆",
  "🧡",
  "🎁",
  "⚡",
  "🌞",
  "🎈",
  "❌",
  "✊",
  "👋",
  "😲",
  "🌿",
  "🤫",
  "👈",
  "😮",
  "🙆",
  "🍻",
  "🍃",
  "🐶",
  "💁",
  "😰",
];

const keys = [
  "host",
  "dnt",
  "user-agent",
  "accept",
  "accept-encoding",
  "accept-language",
  "ad",
  "canvas",
  "emojis",
  "cookies",
  "font-flash",
  "font-js",
  "language-flash",
  "platform-flash",
  "languages-js",
  "platform",
  "plugins",
  "availableScreenResolution",
  "screen_width",
  "screen_height",
  "screen_depth",
  "pixelRatio",
  "indexedDb",
  "addBehavior",
  "openDatabase",
  "storage_local",
  "storage_session",
  "timezoneOffset",
  "timezone",
  "userAgent-js",
  "touchSupport",
  "audio",
  "enumerateDevices",
  "webGLVendor",
  "webGLRenderer",
  "hardwareConcurrency",
  "browser_name",
  "browser_version",
  "engine_name",
  "engine_version",
  "os_name",
  "os_version",
  "device_type",
  "device_model",
  "device_vendor",
  "engine_version",
  "engine_name",
  "cpu.architecture",
];

const db = client.db(DB_NAME);
const counter_c = db.collection("counters");

async function getNextSequenceValue(sequenceName) {
  const r = await counter_c.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    {
      upsert: true,
    }
  );
  return r.value.sequence_value;
}

(async () => {
  for (key of keys) {
    try {
      await counter_c.insertOne({ _id: key, sequence_value: 0 });
    } catch (error) {
      // error is expected if the key already exists
    }
  }
})();

const o_fp_c = db.collection("original");
const n_fp_c = db.collection("normalized");
const k_fp_c = db.collection("keys");
k_fp_c.createIndex({ key: 1, value: 1 }, { unique: true });

var express = require("express");
const session = require("express-session");
const app = express();
app.use(bodyParser.json({ extended: true, limit: "5mb" }));
const sess = {
  secret: "fingerprintislife",
  resave: false,
  saveUninitialized: true,
  cookie: { sameSite: "None" },
}
sess.cookie.secure = true;
sess.cookie.secure = false;

const sessionParser = session(sess)
app.use(sessionParser);
app.use(methodOverride("X-HTTP-Method-Override"));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", req.get("origin"));
  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Origin,Authorization,Origin,x-requested-with,Content-Type,Content-Range,Content-Disposition,Content-Description"
  );
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});
app.set("trust proxy", 1);

const port = 80;

app.get("/api/fp/keys/:key", async function (req, res) {
  res.json(await counter_c.find({ key: req.params.key }).toArray());
});
app.get("/api/fp/counters", async function (req, res) {
  const output = {};
  await counter_c.find({}).forEach((elem) => {
    output[elem._id] = elem.sequence_value;
  });
  res.json(output);
});

const connectedUser = new Set();

app.get("/api/fp/normalized", async function (req, res) {
  const normalized = await n_fp_c.find().toArray();
  res.json(normalized);
});

app.get("/api/fp/connected", async function (req, res) {
  console.log(connectedUser);
  var objIds = Array.from(connectedUser).map(function (id) {
    return ObjectId(id);
  });
  const originals = await o_fp_c.find({ _id: { $in: objIds } }).toArray();
  const normalized = await n_fp_c.find({ _id: { $in: objIds } }).toArray();
  res.json({ originals, normalized });
});

async function getRandomFingerPrint(diff) {
  let normalized = null;
  if (diff) {
    const query = [];
    for (let key in diff.normalized) {
      if (key == "_id") {
        continue;
      }
      const v = {};
      v[key] = { $ne: diff.normalized[key] };
      query.push(v);
    }
    normalized = await n_fp_c
      .aggregate([
        {
          $match: {
            $or: query,
          },
        },
        {
          $sample: { size: 1 },
        },
      ])
      .next();
  } else {
    normalized = await n_fp_c.aggregate([{ $sample: { size: 1 } }]).next();
  }
  const original = await o_fp_c.findOne({ _id: normalized._id });
  return { original, normalized };
}
app.get("/api/fp/random", async function (req, res) {
  return res.json(await getRandomFingerPrint(req.session.fp));
});

app.get("/api/fp/count", async function (req, res) {
  res.json(await o_fp_c.countDocuments({}));
});
app.post("/api/session/logout", async function (req, res) {
  connectedUser.delete(req.session.fpId);
  res.send("ok");
});
app.get("/api/session/", async function (req, res) {
  res.json({
    connected: req.session.fp != null,
    terms: req.session.accept === true,
  });
});
app.get("/api/session/connected", async function (req, res) {
  res.json(req.session.fp != null);
});
app.get("/api/session/emoji", function (req, res) {
  if (!req.session.emoji) {
    req.session.emoji = emojis[Math.round(Math.random() * (emojis.length - 1))];
  }
  res.send(req.session.emoji);
});
app.get("/api/session/accept", async function (req, res) {
  res.json(req.session.accept === true);
});
app.post("/api/session/accept", async function (req, res) {
  req.session.accept = true;
  if (req.session.fp) {
    connectedUser.delete(req.session.fpId);
    req.session.fp = null;
  }
  res.send("ok");
});
app
  .route("/api/fp/")
  .get(async function (req, res) {
    if (req.session.fp) {
      connectedUser.add(req.session.fpId);
      return res.json(req.session.fp);
    } else {
      req.session.fp = await getRandomFingerPrint();
      req.session.fp.random = true;
      req.session.fpId = req.session.fp.original._id;
      return res.json(req.session.fp);
    }
  })
  .put(async function (req, res) {
    if (req.session.fp) {
      connectedUser.add(req.session.fpId);
      return res.json(req.session.fp);
    }
    function keyValueFP(fp, key) {
      if (!fp) {
        return null;
      }
      for (let p of fp) {
        if (p.key == key) {
          return p.value;
        }
      }
    }
    function transformFP(fp) {
      const output = {
        host: req.hostname,
        dnt: keyValueFP(fp, "doNotTrack"),
        "user-agent": req.headers["user-agent"],
        accept: req.accepts().join(","),
        "accept-encoding": req.acceptsEncodings().join(","),
        "accept-language": req.acceptsLanguages().join(","),
        ad: keyValueFP(fp, "adBlock"),
        canvas: keyValueFP(fp, "canvas")[1].replace("canvas fp:", ""),
        emojis: keyValueFP(fp, "emojis"),
        cookies: keyValueFP(fp, "cookies"),
        "font-flash": keyValueFP(fp, "font-flash"),
        "font-js": keyValueFP(fp, "fonts").join(","),
        "language-flash": keyValueFP(fp, "language-flash"),
        "platform-flash": keyValueFP(fp, "platform-flash"),
        "languages-js": keyValueFP(fp, "language"),
        platform: keyValueFP(fp, "platform"),
        plugins: JSON.stringify(keyValueFP(fp, "plugins")),
        screen_width: keyValueFP(fp, "screen_width"),
        screen_height: keyValueFP(fp, "screen_height"),
        screen_depth: keyValueFP(fp, "colorDepth"),
        pixelRatio: keyValueFP(fp, "pixelRatio"),
        hardwareConcurrency: keyValueFP(fp, "hardwareConcurrency"),
        availableScreenResolution: keyValueFP(
          fp,
          "availableScreenResolution"
        ).join(","),
        indexedDb: keyValueFP(fp, "indexedDb"),
        addBehavior: keyValueFP(fp, "addBehavior"),
        openDatabase: keyValueFP(fp, "openDatabase"),
        touchSupport: keyValueFP(fp, "touchSupport").join(","),
        audio: keyValueFP(fp, "audio"),
        enumerateDevices: keyValueFP(fp, "enumerateDevices").join(","),
        storage_local: keyValueFP(fp, "localStorage"),
        storage_session: keyValueFP(fp, "sessionStorage"),
        timezone: keyValueFP(fp, "timezone"),
        timezoneOffset: keyValueFP(fp, "timezoneOffset"),
        "userAgent-js": keyValueFP(fp, "userAgent"),
        webGLVendor: keyValueFP(fp, "webglVendorAndRenderer").split("~")[0],
        webGLRenderer: keyValueFP(fp, "webglVendorAndRenderer").split("~")[1],
      };
      const UAParser = keyValueFP(fp, "UAParser");
      if (UAParser) {
        for (let key in UAParser) {
          if (key == "ua") {
            continue;
          }
          for (let pro in UAParser[key]) {
            output[key + "_" + pro] = UAParser[key][pro];
          }
        }
      }
      return output;
    }
    const fp = transformFP(req.body);
    const normalized = {};
    for (let p in fp) {
      const key = await k_fp_c.findOne({ key: p, value: fp[p] });
      let id = 0;
      if (key == null) {
        id = await getNextSequenceValue(p);
        await k_fp_c.insertOne({ key: p, value: fp[p], index: id, used: 1 });
      } else {
        id = key.index;
        await k_fp_c.updateOne({ key: p, value: fp[p] }, { $inc: { used: 1 } });
      }
      normalized[p] = id;
    }
    const fpDB = await o_fp_c.insertOne(fp);
    normalized._id = fpDB.ops[0]._id;
    const responseQuery = await n_fp_c.insertOne(normalized);
    const output = { original: fp, normalized };
    req.session.fp = output;
    req.session.fp.random = false;
    req.session.fpId = responseQuery.insertedId.toString();
    connectedUser.add(req.session.fpId);
    res.json(output);
  });

app.use('/', proxy('https://rethread.art', {
  proxyReqPathResolver: function (req) {
    return '/code/fingerprinting/exhibition' + req.url
  }
}));

const server = http.createServer(app);
const wss = new WebSocket.Server({ clientTracking: true, noServer: true });

wss.broadcast = function broadcast(data, from) {
  wss.clients.forEach(client => {
    if (client == from) {
      return;
    }
    if (client.readyState === WebSocket.OPEN) {
      client.send(data, error => {
          if (error) {
              console.error(error);
          }
      });
    }
  });
};

server.on("upgrade", function (request, socket, head) {
  console.log("Parsing session from request...");

  sessionParser(request, {}, () => {
    wss.handleUpgrade(request, socket, head, function (ws) {
      wss.emit("connection", ws, request);
    });
  });
});

const userEmojis = {}
wss.on("connection", function (ws, request) {
  let pingInterval = null;
  function ping() {
    if (pingInterval) {
      clearTimeout(pingInterval);
    }
    pingInterval = setTimeout(() => {
      wss.broadcast(JSON.stringify({'event': 'close', 'from': request.session.wsId}), ws)
      delete userEmojis[request.session.wsId];
    }, 30000)
  }
  ws.on("message", function (message) {
    if (!request.session.wsId) {
      request.session.wsId = Math.round(Math.random() * 100000)
    }
    ping();
    message = JSON.parse(message)
    if (message.image) {
      userEmojis[request.session.wsId] = message.image;
      ws.send(JSON.stringify({userEmojis}))
    }
    message.from = request.session.wsId
    wss.broadcast(JSON.stringify(message), ws)
  });

  ws.on("close", function () {
    wss.broadcast(JSON.stringify({'event': 'close', 'from': request.session.wsId}), ws)
    delete userEmojis[request.session.wsId];
  });
});

server.listen(port, function () {
  console.log("Listening on http://localhost:${port}");
});
