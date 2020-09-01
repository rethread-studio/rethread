const JSONStream = require("JSONStream");
const sh = require("shelljs");
const geoip = require("geo-from-ip");
const getServices = require("./services");
const hotspot = require("./hotspot");

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
    return knownIPs[ip];
  }
}

function isIn(clients, json) {
  for (let client in clients) {
    return json.ip_dst[0] == client.ip;
  }
  if (hotspot.isHotspot()) {
    return json.ip_dst[0] == "10.3.141.118";
  }
  return (
    json.ip_dst[0].indexOf("192.168") == 0 ||
    json.ip_dst[0].indexOf("130.229") == 0
  );
}

module.exports = function (networkInterface, kill, broadcast) {
  return new Promise((resolve, reject) => {
    const clients = hotspot.cachedConnectedUsers();

    const cmd =
      "tshark -V -N Ndmntv -l -T ek -i " +
      networkInterface +
      " -e frame.time_epoch -e frame.time -e _ws.col.AbsTime -e ip.src -e ip.dst -e ip.src_host -e ip.dst_host -e dns.qry.name -e frame.len -e http.host -e http.response -e frame.protocols -e eth.dst -e eth.src -e _ws.col.Info -e eth.dst.oui_resolved -e eth.src.oui_resolved  -e http.request.full_uri -e tcp.port";
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
              if (isIn(clients, json)) {
                data.local_ip = json.ip_dst[0];
                data.remote_ip = json.ip_src[0];
                data.local_host = json.ip_dst_host[0];
                data.remote_host = json.ip_src_host[0];
                data.local_mac = json.eth_dst[0];
                data.remote_mac = json.eth_src[0];
                data.out = false;

                if (json.eth_src_oui_resolved) {
                  data.remote_vender = json.eth_src_oui_resolved[0];
                }
                if (json.eth_dst_oui_resolved) {
                  data.local_vender = json.eth_dst_oui_resolved[0];
                }

                if (json.tcp_port) {
                  data.local_port = parseInt(json.tcp_port[1]);
                  data.remote_port = parseInt(json.tcp_port[0]);
                }
              } else {
                data.local_ip = json.ip_src[0];
                data.remote_ip = json.ip_dst[0];
                data.local_host = json.ip_src_host[0];
                data.remote_host = json.ip_dst_host[0];
                data.local_mac = json.eth_src[0];
                data.remote_mac = json.eth_dst[0];
                data.out = true;

                if (json.eth_dst_oui_resolved) {
                  data.remote_vender = json.eth_dst_oui_resolved[0];
                }
                if (json.eth_src_oui_resolved) {
                  data.local_vender = json.eth_src_oui_resolved[0];
                }

                if (json.tcp_port) {
                  data.local_port = parseInt(json.tcp_port[0]);
                  data.remote_port = parseInt(json.tcp_port[1]);
                }
              }
              data.timestamp = parseFloat(json.frame_time_epoch[0]) * 1000;
              data.len = parseInt(json.frame_len[0]);
              if (json.dns_qry_name) {
                data.dns_query = json.dns_qry_name[0];
              }
              if (json._ws_col_Info) {
                data.info = json._ws_col_Info[0];
                if (data.info.indexOf("(ping)") > 0) {
                  // ignore ping
                  return;
                }
              }

              if (json.http_request_full_uri) {
                data.url = json.http_request_full_uri;
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
        .on("end", () =>
          reject("TShark process finished with the following error:\n" + stderr)
        );
    } catch (error) {
      reject(error);
    }
  });
};
