const WebSocket = require('ws');
const osc = require("osc");
const cli = require("cli");

const options = cli.parse({
    oscAddress: ["i", "OSC address", "string", "127.0.0.1"],
    oscPort: ["p", "OSC port", "int", 57120],
});

let client;

function connectToServer() {
    client = new WebSocket('ws://nobel.durieux.me:1189');
    client.on('open', () => {
        console.log("Connected to server");
        // client.send("Vote receiver connected");
        heartbeat(client);
    });

    client.on('ping', heartbeat);
    client.on('close', function clear() {
        clearTimeout(this.pingTimeout);
        connectToServer();
    });

    client.on('message', (data) => {
        let internalData = JSON.parse(data);
        // console.log(internalData);
        let continent;
        let country;
        if (
          internalData.remote_location.country != "Sweden" &&
          internalData.remote_location.country != undefined
        ) {
          country = internalData.remote_location.country;
          continent = internalData.remote_location.continent;
        } else if (internalData.local_location.country != undefined) {
          country = internalData.local_location.country;
          continent = internalData.local_location.continent;
        }
        let args = [];
        args.push({ type: "i", value: internalData.len })
        args.push({ type: "i", value: internalData.out })
        args.push({ type: "s", value: country })
        args.push({ type: "s", value: continent })
        udpPort.send(
            {
              address: "/data",
              args,
            },
            options.oscAddress,
            options.oscPort
          );
    });
}
 
function heartbeat(ws) {
  clearTimeout(ws.pingTimeout);
 
  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  ws.pingTimeout = setTimeout(() => {
    ws.terminate();
  }, 30000 + 1000);
}

connectToServer();

// OSC

const serverPort = 50000 + Math.round(Math.random() * 1000);
let udpPort = new osc.UDPPort({
localAddress: "0.0.0.0",
localPort: serverPort,
metadata: true,
});
udpPort.on("ready", () => {});
udpPort.open();