var request = require("request");
var Gpio = require("onoff").Gpio; //include onoff to interact with the GPIO
var LED = new Gpio(4, "out"); //use GPIO pin 4, and specify that it is output

const Readline = require("@serialport/parser-readline");
const SerialPort = require("serialport");
const port = new SerialPort(
  "/dev/serial/by-id/usb-Teensyduino_USB_Serial_6499800-if00"
);

coordinator = "http://130.237.11.245:8000";
station_name = "BCM";
THRESHOLD = 400;
HOLD_DURAION = 250;

function getStatus() {
  request.get(`${coordinator}/api/stations`, {}, (err, res, body) => {
    try {
      body = JSON.parse(body);
      if (body[station_name].clients.length == 0) {
        ledOff();
      } else {
        ledOn();
      }
    } catch (error) {
      console.error(error);
    }
  });
}
getStatus();
setInterval(getStatus, 1000);

function ledOn() {
  LED.writeSync(1);
}
function ledOff() {
  LED.writeSync(0); //set pin state to 1 (turn LED on)
}

function disconnect() {
  try {
    ledOff();
    request.get(`${coordinator}/api/stations`, {}, (err, res, body) => {
      body = JSON.parse(body);
      clients = body[station_name].clients;
      if (clients.length == 0) {
        console.log("No client to disconnect");
      } else {
        ledOff();
        console.log("Disconnect", clients[0]);
        request.post(
          `${coordinator}/api/station/${station_name}/disconnect`,
          { json: clients[0] },
          (err, res, body) => {
            getStatus();
            setTimeout(() => {
              disconnect_timeout = null;
            }, 2000);
          }
        );
      }
    });
  } catch (error) {
    console.error(error);
  }
}

let disconnect_timeout = null;
let clear_timeout = null;
const stream = port.pipe(new Readline());
stream.on("data", (value) => {
  try {
    value = parseInt(value.toString());
    if (value > THRESHOLD) {
      if (disconnect_timeout === null) {
        console.log("Click", value);
        disconnect_timeout = setTimeout(() => {
          disconnect();
        }, HOLD_DURAION);
      }
    } else if (disconnect_timeout !== null && clear_timeout === null) {
      console.log("unclick", value);
      clearTimeout(disconnect_timeout);
      clear_timeout = setTimeout(() => {
        clear_timeout = null;
        disconnect_timeout = null;
      }, 250);
    }
  } catch (error) {
    console.error(error);
  }
});