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
  args.push({ type: "s", value: data.origin });
  args.push({ type: "s", value: data.action });

  const v = ["collection", "url", "userID", "position", "question", "answer"]
    .filter((f) => data[f] !== undefined)
    .map((i) => {
      if (i == "position") {
        return `${data[i].x};${data[i].y}`;
      }
      return data[i];
    })
    .join(";");
  args.push({ type: "s", value: v });

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
