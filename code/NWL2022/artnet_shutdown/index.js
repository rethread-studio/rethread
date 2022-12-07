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

var start_channel = 0;
var channels_per_led = 3;
var num_leds_y = 15;
var num_leds_x = 5;
var num_channels_total = num_leds_x * num_leds_y * channels_per_led;
var leds = new Uint8Array(num_channels_total);
var leds_right = new Uint8Array(num_channels_total);
  artnet.set(1, leds);
  artnet_right.set(1, leds_right);

setInterval(function() {
  process.exit(0);
}, 500);
