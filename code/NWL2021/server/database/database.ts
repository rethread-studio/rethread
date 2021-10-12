import mongoose from "mongoose";
import { SubEvent } from "sub-events";

export const event = new SubEvent<MonitoringEvent>();
mongoose.plugin((schema, options) => {
  schema.post(/^(find|insert|update|delete|remove)/, function (value, next) {
    event.emit({
      origin: "mongodb",
      action: `${this.op} ${this.mongooseCollection.collectionName}`,
    });
    if (next) next();
  });
});

import config from "../../config";
import { MonitoringEvent } from "../types";

const MONGO_URL = `mongodb://${config.DB_USERNAME}:${config.DB_PASSWORD}@${config.DB_HOSTNAME}:${config.DB_PORT}/`;

export const database = mongoose.connection;

export async function connect() {
  console.log(MONGO_URL);
  await mongoose.connect(MONGO_URL + "production", {
    authSource: "admin",
  });

  return database;
}
