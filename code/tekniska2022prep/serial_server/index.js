require("dotenv").config();
const nodaryEncoder = require("nodary-encoder");
const Gpio = require("onoff").Gpio;
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
var io = require("socket.io-client");

const myEncoder = nodaryEncoder(17, 18); // Using GPIO17 & GPIO18
const button = new Gpio(4, "in", "rising", { debounceTimeout: 10 });

button.watch((err, value) => {
  if (err) {
    throw err;
  }
  socket.emit("rotary_button", value);
});

myEncoder.on("rotation", (direction, value) => {
  socket.emit("rotary", { direction, value });
});

const port = new SerialPort({
  path: process.env.TTY,
  baudRate: 9600,
  autoOpen: true,
});
port.on("open", () => {
  console.log("Connected to serial port: " + process.env.TTY);
});
let lastData;
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));
parser.on("data", (data) => {
  lastData = data;
});

socket = io.connect(process.env.WS_URL, {
  reconnect: true,
});
socket.on("connect", function () {
  console.log("socket connected to " + process.env.WS_URL);
  socket.emit("hello", "world");
});

setInterval(() => {
  socket.emit("serial", lastData, (response) => {
    console.log(response); // "got it"
  });
}, 100);
