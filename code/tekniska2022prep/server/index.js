require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

var emit = io.emit;
io.emit = function () {
  console.log("[DEBUG]", "emit", Array.prototype.slice.call(arguments));
  emit.apply(io, arguments);
};

app.use(express.static(__dirname + "/../ui_demo"));

const buttonMap = {};
buttonMap[process.env.REST_BUTTON] = "REST_BUTTON";
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

  let resetTimeout = null;

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
          io.emit("state", buttonMap[index] + "_ON");
          resetIdle();
        }
        buttonState[buttonMap[index]] = true;
      } else {
        // released
        if (buttonState[buttonMap[index]]) {
          io.emit("state", buttonMap[index] + "_OFF");
          resetIdle();
          if (buttonMap[index] == "REST_BUTTON") {
            clearTimeout(resetTimeout);
            resetTimeout = setTimeout(() => {
              state = "PICTURE";
              io.emit("state", state);
            }, process.env.PICTURE_TIME);
          }
        }
        buttonState[buttonMap[index]] = false;
      }
    }
  });
});

let idleTimeout = null;
function resetIdle() {
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    state = "IDLE";
    io.emit("state", state);
  }, process.env.IDLE_TIME);
}
server.listen(process.env.PORT);
