import { io } from "socket.io-client";
import { join } from "path";
import ITBot from "itbot";

const socket = io("ws://drift.durieux.me:8080");

socket.on("elected", (data) => {
  const bot = new ITBot();

  bot.runStep({
    outputPath: "trash",
    stepPath: join("websites", data.website),
    collectNetwork: false,
    collectProfile: false,
  });
});
