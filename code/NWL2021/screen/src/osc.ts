import * as osc from "osc";
import config from "../../config";
import { MonitoringEvent } from "../../server/types";

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

export function send(data: MonitoringEvent) {
  const args = [];

  for (let i of ["origin", "action"]) {
    let value = data[i];
    const type = typeof value == "number" ? "i" : "s";
    args.push({ type, value });
  }

  if (!udpPort) {
    return;
  }

  udpPort.send(
    {
      address: config.OSC_ADDRESS,
      args,
    },
    config.OSC_IP,
    config.OSC_PORT
  );
}
