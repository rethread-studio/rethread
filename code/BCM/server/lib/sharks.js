const JSONStream = require("JSONStream");
const sh = require("shelljs");
const through = require("through");
const geoip = require("geo-from-ip");
const getServices = require("./services");
const getIP = require("./ip");

function repairJsonString(data) {
  return data
    .replace(/Form item: "(.*)" = "(.*)""/, function (
      match,
      p1,
      p2,
      offset,
      string
    ) {
      return `Form item: \\"${p1}\" = \\"${p2}\\""`;
    })
    .replace(/"tcp_flags_tcp_flags_str": ".*?",/, "");
}

const knownIPs = {};
function getLocation(ip) {
  if (!knownIPs[ip]) {
    try {
      knownIPs[ip] = geoip.allData(ip);
    } catch (error) {
      console.log(error);
    }
  }
  if (knownIPs[ip]) {
    return {
      continent: knownIPs[ip].continent,
      country: knownIPs[ip].country,
    };
  }
}

function isOut(localIp, json) {
  if (localIp) {
    return json.ip_dst[0] == localIp;
  }
  return (
    json.ip_dst[0].indexOf("192.168") == 0 ||
    json.ip_dst[0].indexOf("130.229") == 0
  );
}

module.exports = function (networkInterface, kill, broadcast) {
  return new Promise((resolve, reject) => {
    let localIp = getIP(networkInterface);

    const cmd =
      "tshark -V -N dnN -T ek -i " +
      networkInterface +
      " -e ip.src -e ip.dst -e ip.src_host -e ip.dst_host -e dns.qry.name -e frame.len -e http.host -e http.response -e frame.protocols -e eth.dst -e eth.src";
    try {
      const child = sh.exec(cmd, {
        async: true,
        silent: true,
        maxBuffer: 1024 * 1024 * 1024,
      });
      console.log("Start sniffing on " + networkInterface);
      kill(child);
      let stderr = "";
      child.stderr.on("data", (data) => {
        str = data.toString();
        if (str.indexOf("Capturing on") > -1) {
          return;
        }
        stderr += data.toString();
      });
      child.stdout
        .pipe(
          through(function write(data) {
            try {
              data = repairJsonString(data);
              this.queue(data);
            } catch (error) {
              console.log(error);
            }
          })
        )
        .pipe(
          JSONStream.parse().on("error", (e) => {
            console.log("error", e);
          })
        )
        .on("error", (e) => {
          console.log("error", e);
        })
        .on("data", (d) => {
          try {
            const json = d.layers;
            if (json && json.ip_src) {
              const data = {};
              if (isOut(localIp, json)) {
                data.local_ip = json.ip_dst[0];
                data.remote_ip = json.ip_src[0];
                data.local_host = json.ip_dst_host[0];
                data.remote_host = json.ip_src_host[0];
                data.local_mac = json.eth_dst[0];
                data.remote_mac = json.eth_src[0];
                data.out = false;
              } else {
                data.local_ip = json.ip_src[0];
                data.remote_ip = json.ip_dst[0];
                data.local_host = json.ip_src_host[0];
                data.remote_host = json.ip_dst_host[0];
                data.local_mac = json.eth_src[0];
                data.remote_mac = json.eth_dst[0];
                data.out = true;
              }
              data.timestamp = parseInt(d.timestamp);
              data.len = parseInt(json.frame_len[0]);
              if (json.dns_qry_name) {
                data.dns_query = json.dns_qry_name[0];
              }
              if ("eth:ethertype:ip:icmp:data" == json.frame_protocols[0]) {
                // ignore ping
                return;
              }
              const protocols = json.frame_protocols[0].split(":");
              data.protocol = protocols[protocols.length - 1];

              data.local_location = getLocation(data.local_ip);
              data.remote_location = getLocation(data.remote_ip);

              data.services = getServices(data);

              broadcast(data);
              return;
            }
          } catch (error) {
            console.log(error);
          }
        })
        .on("end", () => {
          reject(
            "TShark process finished with the following error:\n" + stderr
          );
        });
    } catch (error) {
      reject(error);
    }
  });
};
