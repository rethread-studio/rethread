require("dotenv").config();

import * as path from "path";
import got from "got";
import * as redis from "redis";
import express from "express";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import config from "../../config";

import * as engine from "./engine";
import GameSocket from "./GameSocket";

export default async function start() {
  const app = express();
  app.use(express.json());

  app.use(compression());
  app.set("trust proxy", 1);
  app.set("etag", "strong");

  const laureates = JSON.parse(
    (await got("http://api.nobelprize.org/v1/laureate.json")).body
  ).laureates.filter((f) => f.gender == "female");

  app.get("/api/laureates", (req, res) => {
    res.json(laureates);
  });

  app.use(
    "/",
    express.static(path.join(__dirname, "..", "public"), {
      etag: true,
      lastModified: true,
      maxAge: 3600, // 1h
    })
  );
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "..", "public", "index.html"))
  );

  const server = http.createServer(app);
  const io = new Server(server);

  const gameSocket = new GameSocket(io);

  const questionInterval = setInterval(() => {
    engine.state.question =
      engine.questions[
        Math.round(Math.random() * (engine.questions.length - 1))
      ];
    console.log("Update question:", engine.state.question.text);
    gameSocket.emitUpdates();
  }, config.QUESTION_INTERVAL * 1000);

  const updateInterval = setInterval(() => gameSocket.emitUpdates(), 60);

  server.listen(config.SERVER_PORT);
  console.log("NWL Server started on port: " + config.SERVER_PORT);
}

start();
