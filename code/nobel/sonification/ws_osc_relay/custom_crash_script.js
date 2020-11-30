const osc = require("osc");

function sendOSCMessage() {
    let args = [];
    args.push({ type: "s", value: "çao" })
    args.push({ type: "s", value: "" })
    
    udpPort.send(
        {
          address: "/data",
          args,
        },
        "127.0.0.1",
        57120
      );
}

// OSC

const serverPort = 51000;
let udpPort = new osc.UDPPort({
localAddress: "0.0.0.0",
localPort: serverPort,
metadata: true,
});
udpPort.on("ready", () => {
  console.log("Connected via OSC")
  sendOSCMessage();
});
udpPort.open();