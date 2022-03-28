require("dotenv").config();
const Gpio = require("pigpio").Gpio;
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");
var io = require("socket.io-client");

const button = new Gpio(27, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
});

const clock = new Gpio(17, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
});

const direction = new Gpio(18, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN,
});

direction.on("interrupt", (level) => {
  console.log("direction", level);
});

clock.on("interrupt", (level) => {
  console.log("clock", level);
});
button.on("interrupt", (level) => {
  console.log("button", level);
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
