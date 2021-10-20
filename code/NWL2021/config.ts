import { resolve } from "path";

interface Config {
  MOVE_INTERVAL: number;
  DB_HOSTNAME: string;
  DB_PASSWORD: string;
  DB_USERNAME: string;
  DB_PORT: number;
  REDIS_HOSTNAME: string;
  REDIS_PORT: number;
  SERVER_PORT: number;
  SCREEN_PORT: number;
  ANSWER_DURATION: number;
  QUESTION_INTERVAL: number;
  INACTIVITY_TIME: number;
  SERVER_HOST: string;
  OSC_ADDRESS: string;
  OSC_IP: string;
  OSC_PORT: number;
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
  ANSWER_DURATION: 9,
  QUESTION_INTERVAL: 45,
  INACTIVITY_TIME: 60,
  SERVER_HOST: "http://localhost:3000/",
  OSC_ADDRESS: "/cyberglow",
  OSC_IP: "127.0.0.1",
  OSC_PORT: 57130,
  MOVE_INTERVAL: 200,
};

for (let conf in process.env) {
  if ((config as any)[conf] !== undefined) {
    (config as any)[conf] = process.env[conf];
  }
}

export default config;
