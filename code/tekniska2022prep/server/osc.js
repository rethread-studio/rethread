const { UDPPort } = require("osc");

let udpPort;

module.exports.open = function (cb) {
  if (udpPort) close();
  const serverPort = 50000 + Math.round(Math.random() * 1000);
  udpPort = new UDPPort({
    localAddress: "0.0.0.0",
    localPort: serverPort,
    metadata: true,
  });
  udpPort.on("ready", () => cb(serverPort));
  udpPort.open();
};

module.exports.close = function () {
  if (udpPort == null) {
    return null;
  }
  udpPort.close();
  udpPort = null;
};

module.exports.send = function send(value, opt) {
  const args = [];
  args.push({ type: "s", value });

  if (!udpPort) {
    return;
  }

  try {
    udpPort.send(
      {
        address: opt?.address ? opt?.address : process.env.OSC_ADDRESS,
        args,
      },
      opt?.ip ? opt?.ip : process.env.OSC_IP,
      opt?.port ? opt?.port : process.env.OSC_PORT
    );
    // console.log(
    //   {
    //     address: opt?.address ? opt?.address : process.env.OSC_ADDRESS,
    //     args,
    //   },
    //   opt?.ip ? opt?.ip : process.env.OSC_IP,
    //   opt?.port ? opt?.port : process.env.OSC_PORT
    // );
  } catch (error) {
    console.error(error);
  }
};
