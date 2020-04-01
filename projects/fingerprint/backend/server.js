const bodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
// Connection URL
const URL_DB = "mongodb://mongo:27017";
// Database Name
const DB_NAME = "fp";

const client = new MongoClient(URL_DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
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
  "screen_width",
  "screen_height",
  "screen_depth",
  "storage_local",
  "storage_session",
  "timezone",
  "userAgent-js",
  "webGLVendor",
  "webGLRenderer"
];

const db = client.db(DB_NAME);
const counter_c = db.collection("counters");

async function getNextSequenceValue(sequenceName) {
  const r = await counter_c.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { sequence_value: 1 } },
    {
      upsert: true
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
const app = express();
app.use(bodyParser());

const port = 80;

app.use("/", express.static(__dirname + "/static"));

app.get("/api/fp/keys/:key", async function(req, res) {
  res.json(await counter_c.find({ key: req.params.key }).toArray());
});
app.get("/api/fp/counters", async function(req, res) {
  const output = {};
  await counter_c.find({}).forEach(elem => {
    output[elem._id] = elem.sequence_value;
  });
  res.json(output);
});

app.get("/api/fp/random", async function(req, res) {
  const original = await o_fp_c.aggregate([{ $sample: { size: 1 } }]).next();
  const normalized = await n_fp_c.findOne({ _id: original._id });
  res.json({ original, normalized });
});
app.get("/api/fp/count", async function(req, res) {
  res.json(await o_fp_c.countDocuments({}));
});
app
  .route("/api/fp/")
  .get(function(req, res) {
    res.send("Get a random book");
  })
  .put(async function(req, res) {
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
        storage_local: keyValueFP(fp, "localStorage"),
        storage_session: keyValueFP(fp, "sessionStorage"),
        timezone: keyValueFP(fp, "timezone"),
        "userAgent-js": keyValueFP(fp, "userAgent"),
        webGLVendor: keyValueFP(fp, "webglVendorAndRenderer").split("~")[0],
        webGLRenderer: keyValueFP(fp, "webglVendorAndRenderer").split("~")[1]
      };
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
    n_fp_c.insertOne(normalized);
    res.json({ original: fp, normalized });
  });

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
