const { spawn } = require("child_process");
const countryLookup = require("country-code-lookup");
const geoip = require("geoip-lite");

const getServices = require("./services");
const hotspot = require("./hotspot");

const cmd = `tshark -q -N Ndm -V -l -B 150 -T fields -i en14 -e frame.time_epoch -e frame.number -e ip.src -e ip.dst -e ip.src_host -e ip.dst_host -e frame.len -e frame.protocols`;

const knownIPs = {};
function getLocation(ip, data) {
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
      console.log(error, data);
    }
  }
  return {
    country: location.country,
    continent: location.continent,
  };
}

function isIn(clients, destinationIp) {
  for (let client of clients) {
    return destinationIp == client.ip;
  }
  if (hotspot.isHotspot()) {
    return destinationIp.indexOf("10.3.141.") == 0;
  }
  return (
    destinationIp.indexOf("192.168") == 0 ||
    destinationIp.indexOf("130.229") == 0
  );
}

let drop = 0;

setInterval(() => {
  if (drop > 0) {
    console.log("Delayed package", drop);
    drop = 0;
  }
}, 1000);

process.stdin.on("data", function (d) {
  const clients = []; //hotspot.cachedConnectedUsers();
  for
  const lines = d.toString().split("\n");
  for (let line of lines) {
    if (line.length == 0) {
      continue;
    }
    const values = line.split("\t");
    if (values.length < 8) {
      continue;
    }
    const timestamp = Math.round(parseFloat(values[0]) * 1000);

    const data = {
      id: parseInt(values[1]),
      timestamp,
      len: parseInt(values[6]),
      // info: values[12],
      protocol: values[7],
      out: !isIn(clients, values[3]),
    };

    if (new Date().getTime() - timestamp > 1500) {
      drop++;
      continue;
    }

    if (data.out) {
      data.local_ip = values[2].split(",")[0];
      data.remote_ip = values[3].split(",")[0];
      data.local_host = values[4].split(",")[0];
      data.remote_host = values[5].split(",")[0];
      // data.local_mac = values[8].split(",")[0];
      // data.remote_mac = values[9].split(",")[0];
      // data.local_vender = values[10];
      // data.remote_vender = values[11];
    } else {
      data.local_ip = values[3].split(",")[0];
      data.remote_ip = values[2].split(",")[0];
      data.local_host = values[5].split(",")[0];
      data.remote_host = values[4].split(",")[0];
      // data.local_mac = values[9].split(",")[0];
      // data.remote_mac = values[8].split(",")[0];
      // data.local_vender = values[11];
      // data.remote_vender = values[10];
    }
    if (data.local_ip == "") {
      continue;
    }

    data.local_location = getLocation(data.local_ip, data);
    data.remote_location = getLocation(data.remote_ip, data);
    data.services = getServices(data);
  }
});
process.stdin.on("end", function () {});
