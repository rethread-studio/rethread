import { resolve } from "path";

interface Config {
  PORT: number;
}

const config: Config = {
  PORT: 3000,
};

for (let conf in process.env) {
  if ((config as any)[conf] !== undefined) {
    (config as any)[conf] = process.env[conf];
  }
}

export default config;
