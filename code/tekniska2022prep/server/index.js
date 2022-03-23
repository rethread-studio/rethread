require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const osc = require("./osc");

osc.open((port) => {
  console.log("OSC server listening on port " + port);
});

var emit = io.emit;
io.emit = function () {
  console.log("[DEBUG]", "emit", Array.prototype.slice.call(arguments));
  emit.apply(io, arguments);
};

app.use(express.static(__dirname + "/../ui_demo"));

const buttonMap = {};
buttonMap[process.env.RESET_BUTTON] = "RESET_BUTTON";
buttonMap[process.env.SPEED1_BUTTON] = "SPEED1_BUTTON";
buttonMap[process.env.SPEED2_BUTTON] = "SPEED2_BUTTON";
buttonMap[process.env.SPEED3_BUTTON] = "SPEED3_BUTTON";

const buttonState = {};

let state = "IDLE";
io.on("connection", (socket) => {
  console.log("a client connected");

  // send the current state to the new client
  socket.emit("state", state);

  socket.on("disconnect", () => {
    console.log("a client disconnected");
  });

  socket.on("serial", (data) => {
    if (data === null) return;
    const buttonsValue = data.split(",");
    for (let index = 0; index < buttonsValue.length; index++) {
      if (buttonMap[index] === undefined) {
        // the button is not assigned
        continue;
      }
      const button = parseInt(buttonsValue[index]);
      if (button > process.env.THRESHOLD) {
        // pressed
        if (!buttonState[buttonMap[index]]) {
          setState(buttonMap[index] + "_ON");
        }
        buttonState[buttonMap[index]] = true;
      } else {
        // released
        if (buttonState[buttonMap[index]]) {
          setState(buttonMap[index] + "_OFF");
          if (buttonMap[index] == "RESET_BUTTON") {
            resetTimeout = setTimeout(() => {
              setState("PICTURE");
            }, process.env.PICTURE_TIME);
          }
        }
        buttonState[buttonMap[index]] = false;
      }
    }
  });
});

let resetTimeout = null;
let idleTimeout = null;

function setState(s) {
  clearTimeout(resetTimeout);
  state = s;
  io.emit("state", state);
  osc.send(state);
  if (state !== "IDLE") {
    resetIdle();
  }
}

function resetIdle() {
  if (state === "IDLE") {
    return;
  }
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    setState("IDLE");
  }, process.env.IDLE_TIME);
}
server.listen(process.env.PORT);
