require("dotenv").config();
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static(__dirname + "/../wizard_of_oz"));

const buttonState = {};
io.on("connection", (socket) => {
  console.log("a client connected");
  socket.on("disconnect", () => {
    console.log("a client disconnected");
  });
  socket.on("serial", (data) => {
    const buttonsValue = data.split(",");
    for (let index = 0; index < buttonsValue.length; index++) {
      const button = parseInt(buttonsValue[index]);
      if (button > process.env.THRESHOLD) {
        if (!buttonState[index]) {
          io.emit("pressed", index);
          console.log("pressed", index);
        }
        buttonState[index] = true;
      } else {
        if (buttonState[index]) {
          io.emit("release", index);
          console.log("release", index);
        }
        buttonState[index] = false;
      }
    }
  });
});
server.listen(process.env.PORT);
