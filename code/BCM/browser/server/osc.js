const osc = require("osc");

const oscValueOrder = {};

oscValueOrder["request_completed"] = [
  "fromCache",
  "ip",
  "method",
  "statusCode",
  "content_type",
  "content_length",
  "requestId",
  "tabId",
  "timeStamp",
  "type",
  "url",
  "hostname",
  "services",
  "location",
  "tab_url",
];
oscValueOrder["request_created"] = oscValueOrder["request_completed"];
oscValueOrder["home"] = ["action"];
oscValueOrder["idle"] = ["action"];

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

  for (let i of oscValueOrder[address]) {
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
  if (!udpPort) {
    return;
  }

  if (!address) {
    address = targetAddress;
  }
  if (address[0] != "/") {
    address = "/" + address;
  }
  try {
    udpPort.send(
      {
        address,
        args,
      },
      targetIP,
      targetPort
    );
  } catch (error) {
    console.error("[OSC] unable to send message", error)
  }
};
