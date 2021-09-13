require("dotenv").config();

import * as path from "path";
import * as ofs from "fs";
import * as redis from "redis";
import express from "express";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import config from "./config";

import engine from "../public/script/game";

var gameInterval, updateInterval;

function pirateName() {
  var names = [
    "Blackbeard",
    "Jimmy",
    "Roger",
    "Carlos",
    "Juanita",
    "Sophie",
    "Boris",
    "Jenny",
    "Doris",
    "Philippe",
    "Jack",
  ];
  return names[Math.floor(Math.random() * names.length)];
}

function gameLoop() {}

export default async function start() {
  const app = express();
  app.use(express.json());

  app.use(compression());
  app.set("trust proxy", 1);
  app.set("etag", "strong");

  app.use(
    express.static(path.join(__dirname, "..", "public"), {
      etag: true,
      lastModified: true,
      maxAge: 3600, // 1h
    })
  );

  const server = http.createServer(app);
  const io = new Server(server);

  const questionInterval = setInterval(() => {
    engine.state.question =
      engine.questions[
        Math.round(Math.random() * (engine.questions.length - 1))
      ];
    console.log("Update question:", engine.state.question.text);
  }, 5000);

  function emitUpdates() {
    // tell everyone what's up
    io.emit("gameStateUpdate", {
      players: engine.state.players,
      question: engine.state.question,
    });
  }

  io.on("connection", function (socket) {
    console.log("User connected: ", socket.id);
    // start game if this is the first player
    if (Object.keys(engine.state.players).length == 0) {
      gameInterval = setInterval(gameLoop, 25);
      updateInterval = setInterval(emitUpdates, 40);
    }

    // get open position
    var posX = 0;
    var posY = 0;
    while (!engine.isValidPosition({ x: posX, y: posY }, socket.id)) {
      posX = Math.floor(Math.random() * Number(engine.gameSize.x));
      posY = Math.floor(Math.random() * Number(engine.gameSize.y));
    }

    // add player to engine.players obj
    engine.state.players[socket.id] = {
      x: posX,
      y: posY,
      colour: engine.stringToColour(socket.id),
      score: 0,
      name: pirateName(),
    };

    // set socket listeners

    socket.on("disconnect", function () {
      delete engine.state.players[socket.id];
      // end game if there are no engine.players left
      if (Object.keys(engine.state.players).length > 0) {
        io.emit("gameStateUpdate", engine.state.players);
      } else {
        clearInterval(gameInterval);
        clearInterval(updateInterval);
      }
    });

    socket.on("up", function (msg) {
      engine.movePlayer(socket.id, 0, -1);
    });

    socket.on("down", function (msg) {
      engine.movePlayer(socket.id, 0, 1);
    });

    socket.on("left", function (msg) {
      engine.movePlayer(socket.id, -1, 0);
    });

    socket.on("right", function (msg) {
      engine.movePlayer(socket.id, 1, 0);
    });
  });

  server.listen(config.PORT);
  console.log("Database connected and Server started on port: " + config.PORT);
}

start();
