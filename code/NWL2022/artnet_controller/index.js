var options_left = {
  host: "192.168.50.50",

  sendAll: true,
};
var options_right = {
  host: "192.168.50.51",

  sendAll: true,
};

var artnet = require("artnet")(options_left);
var artnet_right = require("artnet")(options_right);
var nodeCleanup = require("node-cleanup");

var start_channel = 0;
var channels_per_led = 3;
var num_leds_y = 15;
var num_leds_x = 5;
var color = [255, 0, 0];
var num_channels_total = num_leds_x * num_leds_y * channels_per_led * 2;
var leds = new Uint8Array(num_channels_total);
var leds_right = new Uint8Array(num_channels_total);
for (let i = 0; i < num_channels_total; i += 3) {
  leds[i] = 255;
  leds[i + 1] = 255;
  leds[i + 2] = 255;
}
var row_leds = new Array();
var default_color = {
  r: 255,
  g: 255,
  b: 255,
};

row_leds.push({
  num_leds: 0,
  left_color: { r: 255, g: 0, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 1,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 2,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 3,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 4,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});
row_leds.push({
  num_leds: 5,
  left_color: { r: 255, g: 225, b: 0, a: 1 },
  right_color: default_color,
});

rows_to_led_values();
// Reset every channel to 0
artnet.set(1, leds);

var ledLoop = setInterval(function () {
  // console.log(leds);
  // if (Math.random() > 0.99) {
  //   default_color.r = Math.random() * 255;
  //   default_color.g = Math.random() * 255;
  //   default_color.b = Math.random() * 255;
  // }
  rows_to_led_values();
  artnet.set(1, leds);
  artnet_right.set(1, leds_right);
}, 1000 / 30);

// Graceful cleanup
var numArtnetsCleanedUp = 0;
nodeCleanup(function (exitCode, signal) {
  if (signal) {
    console.log("Shutting down");
    clearInterval(ledLoop);
    artnet.set(1, new Uint8Array(num_channels_total), function (err, red) {
      artnet.close();
      numArtnetsCleanedUp += 1;
      if (numArtnetsCleanedUp == 2) {
        process.kill(process.pid, signal);
      }
    });
    artnet_right.set(
      1,
      new Uint8Array(num_channels_total),
      function (err, red) {
        artnet_right.close();
        numArtnetsCleanedUp += 1;
        if (numArtnetsCleanedUp == 2) {
          process.kill(process.pid, signal);
        }
      }
    );
    nodeCleanup.uninstall(); // don't call cleanup handler again
    return false;
  }
});

// y_multiplier is because one of the led controllers was configured for 30 leds per column instead of 15
function xy_to_index(x, y, y_multiplier = 1) {
  return (x * num_leds_y * y_multiplier + y) * channels_per_led;
}
function rows_to_led_values() {
  for (let i = 0; i < num_channels_total; i += 3) {
    leds[i] = default_color.r;
    leds[i + 1] = default_color.g;
    leds[i + 2] = default_color.b;
  }
  for (let i = 0; i < num_channels_total; i += 3) {
    leds_right[i] = default_color.r;
    leds_right[i + 1] = default_color.g;
    leds_right[i + 2] = default_color.b;
  }
  for (let i = 0; i < row_leds.length; i++) {
    for (let x = 0; x < row_leds[i].num_leds; x++) {
      // if (x >= num_leds_x) {
      //   break;
      // }
      let left_index = xy_to_index(num_leds_x -x -1, i, 1);
      let right_index = xy_to_index(num_leds_x - x-1, i, 1);
      // console.log("x: " + x + " y: " + i + " index: " + index);
      leds[left_index] = row_leds[i].left_color.r;
      leds[left_index + 1] = row_leds[i].left_color.g;
      leds[left_index + 2] = row_leds[i].left_color.b;
      leds_right[right_index] = row_leds[i].right_color.r;
      leds_right[right_index + 1] = row_leds[i].right_color.g;
      leds_right[right_index + 2] = row_leds[i].right_color.b;
    }
    for (let x = row_leds[i].num_leds; x < num_leds_x; x++) {
      let left_index = xy_to_index(num_leds_x -x -1, i, 1);
      let right_index = xy_to_index(num_leds_x - x-1, i, 1);
      // console.log("x: " + x + " y: " + i + " index: " + index);
      leds[left_index] = default_color.r;
      leds[left_index + 1] = default_color.g;
      leds[left_index + 2] = default_color.b;
      leds_right[right_index] = default_color.r;
      leds_right[right_index + 1] = default_color.g;
      leds_right[right_index + 2] = default_color.b;
    }
  }
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
