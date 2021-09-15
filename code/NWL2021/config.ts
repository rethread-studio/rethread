import { resolve } from "path";

interface Config {
  SERVER_PORT: number;
  SCREEN_PORT: number;
  QUESTION_INTERVAL: number;
  SERVER_HOST: string;
}

const config: Config = {
  SERVER_PORT: 3000,
  SCREEN_PORT: 3500,
  QUESTION_INTERVAL: 10,
  SERVER_HOST: "http://localhost:3000/",
};

for (let conf in process.env) {
  if ((config as any)[conf] !== undefined) {
    (config as any)[conf] = process.env[conf];
  }
}
console.log(config);
export default config;
