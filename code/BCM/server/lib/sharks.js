const fs = require("fs");
const { spawn } = require("child_process");
const countryLookup = require("country-code-lookup");
const geolite2 = require("geolite2");
const maxmind = require("maxmind");

const getServices = require("./services");
const hotspot = require("./hotspot");

const lookup = new maxmind.Reader(fs.readFileSync(geolite2.paths.country));
const lookupASN = new maxmind.Reader(fs.readFileSync(geolite2.paths.asn));

const knownIPs = {};
function getLocation(ip, data) {
  let location = knownIPs[ip];
  if (!location) {
    try {
      location = lookup.get(ip);
      const asn = lookupASN.get(ip);
      if (location != null) {
        try {
          const country = countryLookup.byIso(location.country.iso_code);
          location = {};
          location.country = country.country;
          location.continent = country.continent;
          location.region = country.region;
          location.capital = country.capital;
          location.asn = asn?.autonomous_system_organization;
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
    asn: location.asn,
  };
}

function isLocalIp(clients, destinationIp) {
  let isClient = false;
  for (let client of clients) {
    isClient = destinationIp == client.ip;
  }
  if (isClient) return true;
  if (hotspot.isHotspot()) {
    return destinationIp.indexOf("10.3.141.") == 0;
  }
  return (
    destinationIp.indexOf("192.168") == 0 ||
    destinationIp.indexOf("130.229") == 0 ||
    destinationIp.indexOf("130.237.") == 0
  );
}

module.exports = function (networkInterface, kill, broadcast) {
  return new Promise((resolve, reject) => {
    const cmd = `-B 5 -N Ndmntv -l -T fields -i ${networkInterface} -e frame.time_epoch -e frame.number -e ip.src -e ip.dst -e _ws.col.Source -e _ws.col.Destination -e frame.len -e frame.protocols -e eth.src -e eth.dst -e eth.src.oui_resolved -e eth.dst.oui_resolved -e _ws.col.Info`;
    try {
      const child = spawn("tshark", cmd.split(" "));
      console.log("Start sniffing on " + networkInterface);
      kill(child);
      let stderr = "";
      child.stdout
        .on("error", (e) => {
          console.log("error", e);
        })
        .on("data", (d) => {
          const clients = hotspot.cachedConnectedUsers();

          d = d.toString();
          const lines = d.split("\n");
          for (let line of lines) {
            if (line.length == 0) {
              continue;
            }
            const values = line.split("\t");
            if (values.length != 13) {
              continue;
            }
            const data = {
              id: parseInt(values[1]),
              timestamp: Math.round(parseFloat(values[0]) * 1000),
              len: parseInt(values[6]),
              info: values[12],
              protocol: values[7],
              out: !isLocalIp(clients, values[3]),
            };
            if (new Date().getTime() - data.timestamp > 1500) {
              continue;
            }
            if (data.out) {
              data.local_ip = values[2].split(",")[0];
              data.remote_ip = values[3].split(",")[0];
              data.local_host = values[4].split(",")[0];
              data.remote_host = values[5].split(",")[0];
              data.local_mac = values[8].split(",")[0];
              data.remote_mac = values[9].split(",")[0];
              data.local_vender = values[10];
              data.remote_vender = values[11];
            } else {
              data.local_ip = values[3].split(",")[0];
              data.remote_ip = values[2].split(",")[0];
              data.local_host = values[5].split(",")[0];
              data.remote_host = values[4].split(",")[0];
              data.local_mac = values[9].split(",")[0];
              data.remote_mac = values[8].split(",")[0];
              data.local_vender = values[11];
              data.remote_vender = values[10];
            }
            if (data.local_ip != "") {
              data.local_location = getLocation(data.local_ip, data);
              data.remote_location = getLocation(data.remote_ip, data);
            }

            data.services = getServices(data);
            broadcast(data);
          }
        })
        .on("close", () =>
          reject("TShark process finished with the following error:\n" + stderr)
        );
    } catch (error) {
      reject(error);
    }
  });
};
