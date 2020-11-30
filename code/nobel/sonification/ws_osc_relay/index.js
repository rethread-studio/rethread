const WebSocket = require('ws');
const osc = require("osc");
const cli = require("cli");

const options = cli.parse({
    oscAddress: ["i", "OSC address", "string", "127.0.0.1"],
    oscPort: ["p", "OSC port", "int", 57120],
});

let client;

var allCountries = new Set();
var allContinents = new Set();

function connectToServer() {
    client = new WebSocket('ws://nobel.durieux.me:1189');
    client.on('open', () => {
        console.log("Connected to server via websocket");
        // heartbeat(client);
    });

    client.on('ping', heartbeat);
    client.on('close', function clear() {
        // clearTimeout(this.pingTimeout);
        connectToServer();
    });

    client.on('message', (data) => {
        let internalData = JSON.parse(data);
        // console.log(internalData);
        let continent = "";
        let country = "";
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
        if(country == "Curaçao") {
          // This is needed to stop a weird segfault in SuperCollider
          // more info: https://github.com/supercollider/supercollider/issues/5267
          country = "Curacao";
        }
        let args = [];
        args.push({ type: "i", value: internalData.len })
        args.push({ type: "i", value: internalData.out })
        args.push({ type: "i", value: internalData.local_port })
        args.push({ type: "i", value: internalData.remove_port })
        args.push({ type: "s", value: continent })
        args.push({ type: "s", value: country })

        // if(!allCountries.has(country)) {
        //   if(country == "Curaçao")
        //     console.log(country);
        //   if(country == "Curaçao ")
        //     console.log("with space: " + country);
        //   allCountries.add(country);
        // }
        // if(!allContinents.has(continent)) {
        //   console.log(continent);
        //   allContinents.add(continent);
        // }
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

const serverPort = 51000;
let udpPort = new osc.UDPPort({
localAddress: "0.0.0.0",
localPort: serverPort,
metadata: true,
});
udpPort.on("ready", () => {
  console.log("Connected via OSC")
});
udpPort.open();
udpPort.on("close", () => {
  doLog = false;
  console.log("OSC connection closed")
})