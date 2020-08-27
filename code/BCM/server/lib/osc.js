const osc = require("osc");

const oscValueOrder = [
  "timestamp",
  "local_ip",
  "remote_ip",
  "out",
  "local_location",
  "remote_location",
  "len",
  "protocol",
  "services",
  "station",
  "local_mac",
];

let targetIP = null;
let targetPort = null;
let targetAddress = null;
let udpPort = null;

module.exports.open = (ip, port, address, cb) => {
  targetIP = ip;
  targetPort = port;
  targetAddress = address;

  const serverPort = 50000 + Math.round(Math.random() * 1000);
  udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: serverPort,
    metadata: true,
  });
  udpPort.on("ready", () => cb(serverPort));
  udpPort.open();
};

module.exports.close = () => {
  if (udpPort == null) {
    return null;
  }
  udpPort.close();
  udpPort = null;
};

module.exports.send = (data) => {
  const args = [];

  for (let i of oscValueOrder) {
    let value = data[i];
    console.log(value, i);
    if (i.indexOf("_location") > -1 && value != null) {
      value = value.country;
    }
    const type = typeof value == "number" ? "i" : "s";
    args.push({ type, value });
  }

  if (!udpPort) {
    return;
  }

  udpPort.send(
    {
      address: targetAddress,
      args,
    },
    targetIP,
    targetPort
  );
};
