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

const keys = [
  "host",
  "dnt",
  "user-agent",
  "accept",
  "accept-encoding",
  "accept-language",
  "ad",
  "canvas",
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
app.use(bodyParser());
app.use(
  session({
    secret: "fingerprintislife",
    resave: false,
    saveUninitialized: true,
    cookie: {},
  })
);
if (app.get("env") === "production") {
  app.set("trust proxy", 1);
  sess.cookie.secure = true;
}
app.use(methodOverride("X-HTTP-Method-Override"));
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

const port = 80;

app.use("/", express.static(__dirname + "/static"));

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

app.get("/api/fp/conntected", async function (req, res) {
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
  res.json({connected: req.session.fp != null, terms: req.session.accept === true});
});
app.get("/api/session/connected", async function (req, res) {
  res.json(req.session.fp != null);
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
    req.session.fpId = responseQuery.insertedId.toString();
    connectedUser.add(req.session.fpId);
    res.json(output);
  });

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
