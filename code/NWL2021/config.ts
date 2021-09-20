import { resolve } from "path";

interface Config {
  DB_HOSTNAME: string;
  DB_PASSWORD: string;
  DB_USERNAME: string;
  DB_PORT: number;
  REDIS_HOSTNAME: string;
  REDIS_PORT: number;
  SERVER_PORT: number;
  SCREEN_PORT: number;
  QUESTION_INTERVAL: number;
  SERVER_HOST: string;
}

const config: Config = {
  DB_USERNAME: "nwl2021_admin",
  DB_PASSWORD: "nwl2021",
  DB_HOSTNAME: "mongodb",
  DB_PORT: 27017,
  REDIS_HOSTNAME: "redis",
  REDIS_PORT: 6379,
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

export default config;
