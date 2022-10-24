var options = {
  host: "192.168.50.23",

  sendAll: true,
};

var artnet = require("artnet")(options);
var nodeCleanup = require("node-cleanup");

var start_channel = 0;
var channels_per_led = 3;
var color = [255, 0, 0];
var leds = new Uint8Array(75);

// Reset every channel to 0
artnet.set(1, leds);

var ledLoop = setInterval(function () {
  if (start_channel < 75) {
    for (let i = 0; i < 3; i++) {
      leds[start_channel + i] = color[i];
    }
    console.log("Set " + start_channel + " to " + color);
  }
  console.log(leds);
  artnet.set(1, leds);
  start_channel += channels_per_led;
  for (let i = 0; i < 75; i++) {
    if (leds[i] < 254) {
      leds[i] += 1;
    }
  }
  if (start_channel >= 300) {
    start_channel = 0;
    color = [Math.random() * 100, Math.random() * 100, Math.random() * 100];
  }
}, 1000 / 30);

// Graceful cleanup
nodeCleanup(function (exitCode, signal) {
  if (signal) {
    console.log("Shutting down");
    clearInterval(ledLoop);
    artnet.set(1, new Uint8Array(75), function (err, red) {
      artnet.close();
      process.kill(process.pid, signal);
    });
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
});
