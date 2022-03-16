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

export function send(
  data: any,
  opt?: { address?: string; ip?: string; port?: number }
) {
  const args = [];
  if (data.origin) args.push({ type: "s", value: data.origin });
  if (data.action) args.push({ type: "s", value: data.action });

  const v = [
    "collection",
    "url",
    "socketID",
    "position",
    "question",
    "answer",
    "process",
    "timestamp",
    "event",
    "pid",
    "cpu",
  ]
    .filter((f) => data[f] !== undefined)
    .map((i) => {
      if (i == "position") {
        if (data.position.width !== undefined) {
          return `${data[i].x};${data[i].y};${data[i].width};${data[i].height}`;
        }
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
        address: opt?.address ? opt?.address : config.OSC_ADDRESS,
        args,
      },
      opt?.ip ? opt?.ip : config.OSC_IP,
      opt?.port ? opt?.port : config.OSC_PORT
    );
    // console.log(
    //   {
    //     address: opt?.address ? opt?.address : config.OSC_ADDRESS,
    //     args,
    //   },
    //   opt?.ip ? opt?.ip : config.OSC_IP,
    //   opt?.port ? opt?.port : config.OSC_PORT
    // );

  } catch (error) {
    console.log(args, error);
  }
}
