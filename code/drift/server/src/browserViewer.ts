import { io } from "socket.io-client";
import { join } from "path";
import { existsSync } from "fs";
import ITBot from "itbot";

const socket = io("https://drift.durieux.me");

socket.on("elected", (data) => {
  const bot = new ITBot();
  const stepPath = join("websites", data.website + ".steps");
  if (!existsSync(stepPath)) {
    return;
  }
  bot.runStep({
    outputPath: "trash",
    stepPath,
    collectNetwork: false,
    collectProfile: false,
  });
});
