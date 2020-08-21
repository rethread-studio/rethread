const os = require("os");

function getIPs() {
  const results = {};
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }
  return results;
}

module.exports = (networkInterface) => {
  const ips = getIPs();
  if (!networkInterface) {
    networkInterface = Object.keys(ips)[0];
  }
  if (ips[networkInterface]) {
    return ips[networkInterface][0];
  }
  return null;
};
