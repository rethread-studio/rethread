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
      await counter_c.insert({ _id: key, sequence_value: 0 });
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
        await k_fp_c.insertOne({ key: p, value: fp[p], index: id });
      } else {
        id = key.index;
      }
      normalized[p] = id;
    }
    o_fp_c.insertOne(fp);
    n_fp_c.insertOne(normalized);
    res.json({ original: fp, normalized });
  });

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
