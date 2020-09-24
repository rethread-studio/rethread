const osc = require("osc");

const oscValueOrder = [
  "fromCache",
  "ip",
  "method",
  "statusCode",
  "tabId",
  "timeStamp",
  "type",
  "url",
  "hostname",
  "services",
  "location",
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

module.exports.send = (data, address) => {
  const args = [];

  for (let i of oscValueOrder) {
    let value = data[i];
    if (i.indexOf("location") > -1 && value != null) {
      value = value.country;
    }
    const type = typeof value == "number" ? "i" : "s";
    if (value == null) {
      value = "N.A";
    }
    args.push({ type, value });
  }
  console.log(args);
  if (!udpPort) {
    return;
  }

  if (!address) {
    address = targetAddress;
  }
  udpPort.send(
    {
      address,
      args,
    },
    targetIP,
    targetPort
  );
};
