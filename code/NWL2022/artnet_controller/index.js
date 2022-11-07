var options = {
  host: "192.168.50.23",

  sendAll: true,
};

var artnet = require("artnet")(options);
var nodeCleanup = require("node-cleanup");

var start_channel = 0;
var channels_per_led = 3;
var num_leds_y = 5;
var num_leds_x = 5;
var color = [255, 0, 0];
var leds = new Uint8Array(75);
var row_leds = new Array();

// Reset every channel to 0
artnet.set(1, leds);

var ledLoop = setInterval(function () {
  if (start_channel < 75) {
    // for (let i = 0; i < 3; i++) {
    //   leds[start_channel + i] = color[i];
    // }
    // console.log("Set " + start_channel + " to " + color);
  }
  rows_to_led_values();
  // console.log(leds);
  artnet.set(1, leds);
  start_channel += channels_per_led;
  // for (let i = 0; i < 75; i++) {
  //   if (leds[i] < 254) {
  //     leds[i] += 1;
  //   }
  // }
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

function xy_to_index(x, y) {
  return (x * num_leds_y + y) * channels_per_led;
}
function rows_to_led_values() {
  for (let i = 0; i < row_leds.length; i++) {
    for (let x = 0; x < row_leds[i].num_leds; x++) {
      let index = xy_to_index(x, i);
      leds[index] = row_leds[i].left_color.r;
      leds[index + 1] = row_leds[i].left_color.g;
      leds[index + 2] = row_leds[i].left_color.b;
    }
    for (let x = row_leds[i].num_leds; x < num_leds_x; x++) {
      let index = xy_to_index(x, i);
      leds[index] = 0;
      leds[index + 1] = 0;
      leds[index + 2] = 0;
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
  row_leds.unshift({
    num_leds: num_leds,
    left_color: left_color,
    right_color: right_color,
  });
  while (row_leds.length > num_leds_y) {
    row_leds.pop();
  }
  // rows_to_led_values();
  // console.log("Remote info is: ", info);
});

// Open the socket.
udpPort.open();

// When the port is read, send an OSC message to, say, SuperCollider
udpPort.on("ready", function () {});
