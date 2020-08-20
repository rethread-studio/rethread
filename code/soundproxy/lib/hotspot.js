const arp = require("./arp");
const ping = require("ping");

module.exports.isConnected = async (interface) => {
  const devices = await arp({
    interface,
  });
  for (let device of devices) {
    if (device.ip.split(".")[3] == 1 || device.ip.split(".")[3] == 255) {
      continue;
    }
    device.alive = await (await ping.promise.probe(device.ip, {min_reply: 3})).alive;
  }
  return devices.filter((f) => f.alive).length > 0;
};
