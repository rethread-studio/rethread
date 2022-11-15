var options = {
  host: "192.168.50.50",

  sendAll: true,
};

var artnet = require("artnet")(options);
var nodeCleanup = require("node-cleanup");

var start_channel = 0;
var channels_per_led = 3;
var num_leds_y = 15;
var num_leds_x = 5;
var color = [255, 0, 0];
var num_channels_total = num_leds_x * num_leds_y * channels_per_led * 2;
var leds = new Uint8Array(num_channels_total);
for (let i = 0; i < num_channels_total; i++) {
  leds[i] = 255;
}
var row_leds = new Array();
var default_color = {
  r: 255,
  g: 255,
  b: 255,
};

// Reset every channel to 0
artnet.set(1, leds);

var ledLoop = setInterval(function () {
  rows_to_led_values();
  // console.log(leds);
  artnet.set(1, leds);
}, 1000 / 60);

// Graceful cleanup
nodeCleanup(function (exitCode, signal) {
  if (signal) {
    console.log("Shutting down");
    clearInterval(ledLoop);
    artnet.set(1, new Uint8Array(num_channels_total), function (err, red) {
      artnet.close();
      process.kill(process.pid, signal);
    });
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
});

function xy_to_index(x, y) {
  return (x * num_leds_y + y) * channels_per_led;
}
function rows_to_led_values() {
  for (let i = 0; i < row_leds.length; i++) {
    for (let x = 0; x < row_leds[i].num_leds; x++) {
      if (x >= num_leds_x) {
        break;
      }
      let index = xy_to_index(x, i);
      leds[index] = row_leds[i].left_color.r;
      leds[index + 1] = row_leds[i].left_color.g;
      leds[index + 2] = row_leds[i].left_color.b;
    }
    for (let x = row_leds[i].num_leds; x < num_leds_x; x++) {
      let index = xy_to_index(x, i);
      // console.log(index);
      leds[index] = default_color.r;
      leds[index + 1] = default_color.g;
      leds[index + 2] = default_color.b;
    }
  }
  // console.log(leds);
}

// Receive one row from a new call
var osc = require("osc");
// Create an osc.js UDP Port listening on port 57122.
var udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57122,
  metadata: true,
});

// Listen for incoming OSC messages.
udpPort.on("message", function (oscMsg, timeTag, info) {
  // console.log("An OSC message just arrived!", oscMsg);
  // console.log(oscMsg.args);
  let num_leds = oscMsg.args[0].value;
  let left_color = oscMsg.args[1].value;
  let right_color = oscMsg.args[2].value;
  row_leds.push({
    num_leds: num_leds,
    left_color: left_color,
    right_color: right_color,
  });
  while (row_leds.length > num_leds_y) {
    row_leds.shift();
  }
  // rows_to_led_values();
  // console.log("Remote info is: ", info);
});

// Open the socket.
udpPort.open();

// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {});
