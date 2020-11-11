var Collector = require("@bettercorp/node-netflowv9");
const geoip = require("geoip-lite");
const countryLookup = require("country-code-lookup");
const http = require("http");
const express = require("express");
const bodyParser = require("body-parser");
const reload = require("reload");
const watch = require("watch");


const WSServer = require("./WSServer");
const services = require("./services");

const app = express();
app.use(bodyParser.json());

let visualPath = "../visuals-sketch2";
if (process.argv.length > 2) {
  visualPath = process.argv[2];
}
app.use("/", express.static(visualPath));

const server = http.createServer(app);
const wss = WSServer(server);

wss.on("connection", function (ws, request) {
  ws.on("message", function (message) {});
});

// Reload code here
reload(app)
  .then(function (reloadReturned) {
    watch.watchTree(visualPath, function (f, curr, prev) {
      // Fire server-side reload event
      reloadReturned.reload();
    });
    server.listen(1189, function () {
      console.log(`Netflow server on port 1189`);
    });
  })
  .catch(function (err) {
    console.error(
      "Reload could not start, could not start server/sample app",
      err
    );
  });

const knownIPs = {};
function getLocation(ip) {
  let location = knownIPs[ip];
  if (!location) {
    try {
      location = geoip.lookup(ip);
      if (location != null && location.country != "") {
        try {
          const country = countryLookup.byIso(location.country);
          location.country = country.country;
          location.continent = country.continent;
          location.region = country.region;
          location.capital = country.capital;
        } catch (error) {
          console.error(error, location);
        }
      } else {
        location = {
          country: undefined,
          continent: undefined,
        };
      }
      knownIPs[ip] = location;
    } catch (error) {
      console.log(error);
    }
  }
  return {
    country: location.country,
    continent: location.continent,
  };
}

let count = 0;
new Collector({ port: 1109 }).on("data", function (data) {
  count += data.flows.length;
  for (let flow of data.flows) {
    const data = {
      len: flow.in_bytes,
      out: flow.direction == 1,
    };
    if (data.out) {
      data.local_ip = flow.ipv4_dst_addr;
      data.remove_ip = flow.ipv4_src_addr;
      data.local_port = flow.l4_src_port;
      data.remove_port = flow.l4_dst_port;
    } else {
      data.local_ip = flow.ipv4_src_addr;
      data.remove_ip = flow.ipv4_dst_addr;
      data.local_port = flow.l4_dst_port;
      data.remove_port = flow.l4_src_port;
    }
    data.local_location = getLocation(data.local_ip);
    data.remote_location = getLocation(data.remove_ip);
    data.services = services(data);
    delete data.local_ip;
    delete data.remove_ip;
    wss.broadcast(data);
    return;
  }
});
