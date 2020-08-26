const arp = require("./arp");
const ping = require("ping");
const sh = require("shelljs");

module.exports.isHotspot = () => {
  try {
    const output = sh.which("hostapd");
    return output != null;
  } catch (error) {
    return false;
  }
};

const listwificlients = async (interface) => {
  const output = sh.exec(`iw dev ${interface} station dump`, { silent: true });
  const clients = [];
  const lines = output.stdout.split("\n");
  let currentClient = null;
  for (let line of lines) {
    if (line.indexOf("Station ") == 0) {
      if (currentClient != null) {
        clients.push(currentClient);
      }
      const split = line.split(" ");

      currentClient = {
        mac: split[1],
        signal: "",
      };
    } else if (line.indexOf(":") > -1) {
      line = line.trim();
      const split = line.split(":");
      let value = split[1].trim().split(" ")[0];
      if (value == "yes") {
        value = true;
      } else if (value == "no") {
        value = false;
      }
      currentClient[split[0].replace(" ", "_")] = value;
    }
  }
  if (currentClient != null) {
    clients.push(currentClient);
  }
  return clients;
};
const arpGetUsers = async (interface) => {
  const devices = (
    await arp({
      interface,
    })
  ).filter((device) => {
    return (
      device.ip.split(".")[3] != 1 &&
      device.ip.split(".")[3] != 255 &&
      device.mac != "ff:ff:ff:ff:ff:ff"
    );
  });
  const promises = [];
  for (let device of devices) {
    promises.push(ping.promise.probe(device.ip, { min_reply: 2, timeout: 1 }));
  }
  const results = await Promise.all(promises);
  for (let index = 0; index < devices.length; index++) {
    const device = devices[index];
    device.alive = results[index].alive;
  }
  return devices.filter((f) => f.alive);
};

module.exports.connectedUsers = async (interface) => {
  if (module.exports.isHotspot()) {
    const clients = await listwificlients(interface);
    const devices = await arp({
      interface,
    });
    const output = [];
    for (let client of clients) {
      for (let device of devices) {
        if (client.mac == device.mac) {
          device.signal = client.signal;
          device.signalMin = client.signalMin;
          device.signalMax = client.signalMax;
        }
      }
    }
    return output;
  } else {
    return await arpGetUsers(interface);
  }
};

module.exports.c = async (interface) => {
  return (await module.exports.connectedUsers(interface)).length > 0;
};

module.exports.disconnect = async (client_mac) => {
  sh.exec(`sudo hostapd_cli deauthenticate ${client_mac}`, { silent: true });
  sh.exec(`sudo hostapd_cli disassociate ${client_mac}`, { silent: true });
  sh.exec(`echo ${client_mac} > /home/pi/hostapd.deny`, { silent: true });
  sh.exec(`sudo /etc/init.d/hostapd reload`, { silent: true });
};

module.exports.unban = async () => {
  sh.exec(`echo '' > /home/pi/hostapd.deny`, { silent: true });
  sh.exec(`sudo /etc/init.d/hostapd reload`, { silent: true });
};
