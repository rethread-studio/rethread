require("dotenv").config();
const fs = require("fs");
const mosaic = require("mosaic-node-generator");
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const osc = require("./osc");

const snapsFolder = __dirname + "/snaps/";

osc.open((port) => {
  console.log("OSC server listening on port " + port);
});

var emit = io.emit;
io.emit = function () {
  console.log("[DEBUG]", "emit", Array.prototype.slice.call(arguments));
  emit.apply(io, arguments);
};

app.use(express.static(__dirname + "/../ui_demo"));

async function generateMosaic() {
  console.log("Generating mosaic...");
  const m = new mosaic.MosaicImage(
    new mosaic.JimpImage(
      await mosaic.JimpImage.read(__dirname + "/img/idle.jpeg")
    ),
    snapsFolder,
    mosaic.CONFIG.cell_width,
    mosaic.CONFIG.cell_height,
    10,
    10,
    __dirname + "/thumbs",
    __dirname + "/thumbs",
    false
  );
  await m.readTiles();
  await m.processRowsAndColumns(0, 0, m.rows, m.columns);
  await m.image.save(__dirname + "/img/mosaic");
  // m.generateThumbs();
}

setInterval(() => {
  try {
    generateMosaic();
  } catch (error) {
    console.error(error);
  }
}, 3 * 60 * 1000);
try {
  generateMosaic();
} catch (error) {
  console.error(error);
}

app.get("/img/mosaic.jpg", async (req, res) => {
  if (fs.existsSync(__dirname + "/img/mosaic.jpg")) {
    res.sendFile(__dirname + "/img/mosaic.jpg");
  } else {
    res.sendFile(__dirname + "/img/idle.jpeg");
  }
});

app.get("/js/button_map.js", (req, res) => {
  res.send(
    "button_map=" +
      JSON.stringify({
        RESET_BUTTON: process.env.RESET_BUTTON,
        SPEED1_BUTTON: process.env.SPEED1_BUTTON,
        SPEED2_BUTTON: process.env.SPEED2_BUTTON,
        SPEED3_BUTTON: process.env.SPEED3_BUTTON,
      })
  );
});

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

  socket.on("picture", (image) => {
    const fileName = "snap_" + new Date().getTime();
    const filePath = snapsFolder + fileName + ".png";
    // Remove header
    let base64Image = image.split(";base64,").pop();
    fs.writeFile(
      filePath,
      base64Image,
      { encoding: "base64" },
      async function (err) {
        if (err) {
          console.log(err);
        } else {
          const img = new mosaic.JimpImage(
            await mosaic.JimpImage.read(filePath)
          );
          img.image.cover(mosaic.CONFIG.cell_width, mosaic.CONFIG.cell_height);
          await img.save(__dirname + "/thumbs/" + fileName);
        }
      }
    );
  });

  socket.on("rotary", (data) => {
    if (data.direction == "R") {
      io.emit("step", "next");
    } else {
      io.emit("step", "previous");
    }
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
