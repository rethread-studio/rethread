require("dotenv").config();
const fs = require("fs");
const mosaic = require("mosaic-node-generator");
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const osc = require("./osc");
const { exec } = require("node:child_process");

const snapsFolder = __dirname + "/snaps/";

const { SerialPort } = require("serialport");
var port = "/dev/ttyACM0";

console.log("serial ports: " + JSON.stringify(SerialPort.list()));
var serialPort = new SerialPort({
  path: port,
  baudRate: 9600,
}).on("error", () => {
  console.error("Serial port connection error");
});

serialPort.on("open", function () {
  console.log("-- Connection opened --");
  serialPort.on("data", function (data) {
    console.log("Data received: " + data);

    for (let byte of data) {
      let char = String.fromCharCode(byte);
      if (char == "d" || char == "u") {
        resetIdle();
        countEventSec();
        const speed = getNbEventSec();
        if (char == "d") {
          io.emit("step", { direction: "next", speed });
          osc.send({ state: "next", events: speed });
        } else {
          io.emit("step", { direction: "previous", speed });
          osc.send({ state: "previous", events: speed });
        }
      } else if (char == "b") {
        // button pressed
        io.emit("capture", data);
        osc.send({ state: "capture" });
      }
    }
  });
});

osc.open((port) => {
  console.log("OSC server listening on port " + port);
});

var emit = io.emit;
io.emit = function () {
  console.log("[DEBUG]", "emit", Array.prototype.slice.call(arguments));
  emit.apply(io, arguments);
};

app.use("/code", express.static(__dirname + "/../code_execution"));
app.use(express.static(__dirname + "/../ui_demo"));

function shuffle(array) {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

async function generateMosaic() {
  console.log("Generating mosaic...");

  const image = new mosaic.JimpImage(
    await mosaic.JimpImage.read(__dirname + "/img/idle.jpeg")
  );
  const columns = 45;
  const rows = 25;
  image.resize(
    mosaic.CONFIG.cell_width * columns,
    mosaic.CONFIG.cell_height * rows
  );
  const images = (await fs.promises.readdir(__dirname + "/thumbs"))
    .filter((f) => f.endsWith(".jpg"))
    .map((f) => __dirname + "/thumbs/" + f);
  let index = 0;
  let i = 0;
  while (true) {
    i++;
    index++;
    if (i >= images.length) {
      i = 0;
      shuffle(images);
    }
    const img = new mosaic.JimpImage(await mosaic.JimpImage.read(images[i]));
    const x = index % columns;
    const y = Math.floor(index / columns);
    image.composite(
      img,
      x * mosaic.CONFIG.cell_width,
      y * mosaic.CONFIG.cell_height
    );
    if (index > columns * rows) break;
  }
  await image.save(__dirname + "/img/mosaic");
  console.log("Generating mosaic Done...");
  // const m = new mosaic.MosaicImage(
  //   new mosaic.JimpImage(
  //     await mosaic.JimpImage.read(__dirname + "/img/idle.jpeg")
  //   ),
  //   snapsFolder,
  //   mosaic.CONFIG.cell_width,
  //   mosaic.CONFIG.cell_height,
  //   10,
  //   10,
  //   __dirname + "/thumbs",
  //   __dirname + "/thumbs",
  //   false
  // );
  // await m.readTiles();
  // await m.processRowsAndColumns(0, 0, m.rows, m.columns);
  // await m.image.save(__dirname + "/img/mosaic");
  // m.generateThumbs();
}

// setInterval(() => {
//   try {
//     generateMosaic();
//   } catch (error) {
//     console.error(error);
//   }
// }, 3 * 60 * 1000);
// try {
//   generateMosaic();
// } catch (error) {
//   console.error(error);
// }

app.get("/img/mosaic.jpg", async (req, res) => {
  if (fs.existsSync(__dirname + "/img/mosaic.jpg")) {
    res.sendFile(__dirname + "/img/mosaic.jpg");
  } else {
    res.sendFile(__dirname + "/img/idle.jpeg");
  }
});

app.get("/js/button_map.js", (req, res) => {
  res.send("button_map=" + JSON.stringify(process.env));
});

const buttonMap = {};
buttonMap[process.env.RESET_BUTTON] = "RESET_BUTTON";
buttonMap[process.env.SPEED1_BUTTON] = "SPEED1_BUTTON";
buttonMap[process.env.SPEED2_BUTTON] = "SPEED2_BUTTON";
buttonMap[process.env.SPEED3_BUTTON] = "SPEED3_BUTTON";

const buttonState = {};

const countEvent = {};
function countEventSec() {
  const date = new Date().getTime() / 100;
  countEvent[date] = countEvent[date] ? countEvent[date] + 1 : 1;
}

/**
 * return the average number of events in the last 500 milliseconds
 * @returns {number}
 */
function getNbEventSec() {
  let total = 0;
  for (const i in countEvent) {
    if (new Date().getTime() / 100 - i >= 5) {
      // keep data from the last 500 milliseconds
      delete countEvent[i];
      continue;
    }
    total += countEvent[i];
  }
  return total / 5;
}

let state = "IDLE";
let lastImage = null;
io.on("connection", (socket) => {
  console.log("a client connected");

  // socket.onAny(console.log);

  // send the current state to the new client
  socket.emit("state", state);

  socket.on("code_display", () => {
    socket.join("code_display");

    if (lastImage != null) {
      io.to("code_display").emit("image", lastImage);
    }
  });

  socket.on("disconnect", () => {
    console.log("a client disconnected");
  });

  socket.on("picture", (image) => {
    if (image == null) return;
    osc.send({ state: "picture" });
    io.to("code_display").emit("image", image);
    lastImage = image;
    const fileName = "snap_" + new Date().getTime();
    const filePath = snapsFolder + fileName + ".png";
    // Remove header
    let base64Image = image.split(";base64,").pop();
    // io.to("code_display").emit("image", base64Image);
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

          // run hexdump on filePath

          // run the `ls` command using exec
          exec("hexdump -C " + filePath, (err, output) => {
            // once the command has completed, the callback function is called
            if (err) {
              // log and return if we encounter an error
              console.error("could not execute command: ", err);
              return;
            }
            // log the output received from the command
            // console.log("Output: \n", output)

            socket.emit("picture_hexdump", output);
          });
        }
      }
    );
  });

  socket.on("stage", (data) => {
    io.emit("stage", data);
    osc.send({ state: data, events: getNbEventSec() });
  });

  socket.on("zoom", (data) => {
    io.emit("zoom", data);
    osc.send({ state: "zoom", data });
  });
  socket.on("speed", (data) => {
    io.emit("speed", data);
    osc.send({ state: "speed", data });
  });
  socket.on("transition", (data) => {
    io.emit("transition", data);
    osc.send({ state: "transition", data });
  });
  socket.on("capture", (data) => {
    io.emit("capture", data);
    osc.send({ state: "capture" });
  });
  socket.on("filter", (data) => {
    io.emit("filter", data);
    osc.send({ state: "filter", data });
  });
  socket.on("timer", (data) => {
    osc.send({ state: "timer", data });
  });
  socket.on("onStep", (data) => {
    osc.send({
      state: "step",
      events: getNbEventSec(),
      index: data.index,
      total: data.total,
    });
    io.to("code_display").emit("step", {
      direction: "next",
      speed: getNbEventSec(),
    });
  });
  socket.on("step", (data) => {
    io.emit("step", { direction: "next", speed: getNbEventSec() });
  });

  // socket.on("rotary", (data) => {
  //   resetIdle();
  //   countEventSec();
  //   const speed = getNbEventSec();
  //   if (data.direction == "R") {
  //     io.emit("step", { direction: "next", speed });
  //     osc.send({ state: "next", events: speed });
  //   } else {
  //     io.emit("step", { direction: "previous", speed });
  //     osc.send({ state: "previous", events: speed });
  //   }
  // });

  // socket.on("serial", (data) => {
  //   if (data === null) return;
  //   const buttonsValue = data.split(",");
  //   for (let index = 0; index < buttonsValue.length; index++) {
  //     if (buttonMap[index] === undefined) {
  //       // the button is not assigned
  //       continue;
  //     }
  //     const button = parseInt(buttonsValue[index]);
  //     if (button > process.env.THRESHOLD) {
  //       // pressed
  //       if (!buttonState[buttonMap[index]]) {
  //         setState(buttonMap[index] + "_ON");
  //       }
  //       buttonState[buttonMap[index]] = true;
  //     } else {
  //       // released
  //       if (buttonState[buttonMap[index]]) {
  //         setState(buttonMap[index] + "_OFF");
  //         if (buttonMap[index] == "RESET_BUTTON") {
  //           resetTimeout = setTimeout(() => {
  //             setState("PICTURE");
  //           }, process.env.PICTURE_TIME);
  //         }
  //       }
  //       buttonState[buttonMap[index]] = false;
  //     }
  //   }
  // });
});

let resetTimeout = null;
let idleTimeout = null;

function setState(s) {
  clearTimeout(resetTimeout);
  state = s;
  io.emit("state", state);
  osc.send({ state, events: getNbEventSec() });
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
server.listen(process.env.PORT, () =>
  console.log("Server listening on *:" + process.env.PORT)
);
