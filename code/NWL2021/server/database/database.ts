import mongoose from "mongoose";
import config from "../../config";

const MONGO_URL = `mongodb://${config.DB_USERNAME}:${config.DB_PASSWORD}@${config.DB_HOSTNAME}:${config.DB_PORT}/`;

export const database = mongoose.connection;

export async function connect() {
  console.log(MONGO_URL)
  await mongoose.connect(MONGO_URL + "production", {
    authSource: "admin",
  });

  return database;
}
