const sh = require("exec-sh");
const os = require("os");

let browser = null;
module.exports.open = (url) => {
  if (browser != null) {
    module.exports.close();
  }
  let chromePath = "chromium-browser";
  if ("Darwin" == os.type()) {
    chromePath =
      "'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'";
  }

  const cmd = `${chromePath} --noerrdialogs --disable-infobars --kiosk ${url}`;
  browser = sh(cmd, {
    async: true,
    silent: true,
  });
};

module.exports.close = () => {
  if (browser) browser.kill(1);
  browser = null;
};

module.exports.isOpen = () => browser != null;
