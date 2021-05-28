import ITBot from "itbot";
import * as schedule from "node-schedule";
import { join } from "path";

const steps = [
  "spotify",
  "qwant",
  "bing",
  "google",
  "duckduckgo",
  "kiddle",
  "yahoo",
  "wikipedia",
];
schedule.scheduleJob("*/5 * * * *", async () => {
  for (let step of steps) {
    try {
      const bot = new ITBot();

      const d = new Date();
      d.setMilliseconds(0);
      d.setMinutes(0);
      const session = `${step}/${d.getTime()}`;
      await bot.runStep({
        outputPath: session,
        stepPath: join("steps", `${step}.steps`),
      });
    } catch (error) {
      console.log(error);
    }
  }
});
