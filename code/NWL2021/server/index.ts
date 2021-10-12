require("dotenv").config();

import * as path from "path";
import express from "express";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import config from "../config";

import GameSocket from "./GameSocket";
import * as database from "./database/database";
import { Engine } from "./engine";
import routes from "./routes";
import StateModel from "./database/state/state.model";
import { importDefaultConfiguration } from "../import";

export default async function start() {
  await database.connect();
  const app = express();
  app.use(express.json());

  app.use(compression());
  app.set("trust proxy", 1);
  app.set("etag", "strong");

  app.use("/api", routes.laureates);

  app.use(
    "/admin/",
    express.static(path.join(__dirname, "..", "front-end", "dashboard"))
  );

  app.use(
    "/img/laureates/",
    express.static(path.join(__dirname, "..", "front-end", "laureates"))
  );

  app.use(
    "/",
    express.static(
      path.join(__dirname, "..", "front-end", "cyberlights", "build"),
      {
        etag: true,
        lastModified: true,
        maxAge: 3600, // 1h
      }
    )
  );

  const server = http.createServer(app);
  const io = new Server(server);

  const gameState = await StateModel.findOne();
  if (!gameState) {
    console.log("import default configuration");
    await importDefaultConfiguration();
  }

  const engine = new Engine();
  await engine.init();
  const gameSocket = new GameSocket(io, engine);

  app.use("/api/admin", routes.admin(engine));

  app.get("*", (req, res) =>
    res.sendFile(
      path.join(
        __dirname,
        "..",
        "front-end",
        "cyberlights",
        "build",
        "index.html"
      )
    )
  );

  server.listen(config.SERVER_PORT);
  console.log("NWL Server started on port: " + config.SERVER_PORT);
}

start();
