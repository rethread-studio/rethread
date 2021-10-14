require("dotenv").config();

import * as path from "path";
import express from "express";
import compression from "compression";
import http from "http";
import config from "../../config";
import { io } from "socket.io-client";
import { Server } from "socket.io";
import * as osc from "./osc";
import { GameState, MonitoringEvent, Player } from "../../server/types";
import { Engine } from "../../server/engine";
import { IState } from "../../server/database/state/state.types";

export default async function start() {
  const app = express();
  app.use(express.json());

  app.use(compression());
  app.set("trust proxy", 1);
  app.set("etag", "strong");

  app.use(
    "/monitor/",
    express.static(path.join(__dirname, "..", "..", "front-end", "monitor"))
  );

  app.use(
    express.static(path.join(__dirname, "..", "public"), {
      etag: true,
      lastModified: true,
      maxAge: 0, // 1h
    })
  );
  app.use(
    "/img/laureates/",
    express.static(path.join(__dirname, "..", "..", "front-end", "laureates"))
  );

  const server = http.createServer(app);
  const serverIo = new Server(server);

  const socketMonitor = io(config.SERVER_HOST + "visualization");
  const socket = io(config.SERVER_HOST + "screen");

  let setup: IState = null;
  let gameState: GameState = null;

  osc.open((port) => {
    console.log("OSC server started on port: " + port);
  });

  socketMonitor.on("event", (data: MonitoringEvent) => {
    const out = data as any;
    switch (data.origin) {
      case "user":
        const player = gameState.players.filter((f) => f.id == data.userID)[0];
        if (player) {
          out.position = {
            x: player.x,
            y: player.y,
          };
        }
        if (data.action == "userAnswer") {
          for (let i = 0; i < setup.answersPositions.length; i++) {
            const position = setup.answersPositions[i];
            const answer = gameState.question.answers[i];
            if (Engine.checkCollision(player as Player, position)) {
              out.answer = answer.text;
            }
          }
        }
        break;
      case "gameEngine":
        if (data.action == "newQuestion") {
          out.question = gameState.question.text;
        } else if (data.action == "answer") {
          out.answer = gameState.question.answers.filter(
            (f) => f.isCorrect
          )[0].text;
        }
        break;
    }
    osc.send(out);
    serverIo.of("monitor").emit("event", out);
  });

  serverIo.of("screen").on("connection", (socket) => {
    console.log("Screen connected");
    if (setup) socket.emit("setup", setup);
    socket.on("disconnect", function () {
      console.log("Screen disconnected");
    });
  });

  socket.on("setup", function (data) {
    setup = data;
    serverIo.of("screen").emit("setup", setup);
  });

  socket.on("gameStateUpdate", (data) => {
    gameState = data;
    serverIo.of("screen").emit("gameStateUpdate", data);
  });

  server.listen(config.SCREEN_PORT);
  console.log("Screen server started on port: " + config.SCREEN_PORT);
}

start();
