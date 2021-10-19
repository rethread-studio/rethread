import * as osc from "osc";
import config from "../../config";

let udpPort;

export function open(cb) {
  if (udpPort) close();
  const serverPort = 50000 + Math.round(Math.random() * 1000);
  udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: serverPort,
    metadata: true,
  });
  udpPort.on("ready", () => cb(serverPort));
  udpPort.open();
}

export function close() {
  if (udpPort == null) {
    return null;
  }
  udpPort.close();
  udpPort = null;
}

export function send(data: any) {
  const args = [];

  for (const i of [
    "origin",
    "action",
    "userID",
    "answer",
    "question",
    "position",
    "collection",
    "url",
  ]) {
    const value = data[i];
    if (value === undefined) continue;
    if (i == "position") {
      args.push({ type: "i", value: value.x });
      args.push({ type: "i", value: value.y });
      continue;
    }
    const type = typeof value == "number" ? "i" : "s";
    args.push({ type, value });
  }

  if (!udpPort) {
    return;
  }

  try {
    udpPort.send(
      {
        address: config.OSC_ADDRESS,
        args,
      },
      config.OSC_IP,
      config.OSC_PORT
    );
  } catch (error) {
    console.log(args, error);
  }
}
