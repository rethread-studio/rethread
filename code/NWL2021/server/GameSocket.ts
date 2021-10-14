import { Namespace, Server, Socket } from "socket.io";
import config from "../config";
import { IQuestion, IAnswer } from "./database/questions/questions.types";
import { Engine } from "./engine";
import Monitor from "./Monitor";
import { GameState, MonitoringEvent, Player, UserEvent } from "./types";

export default class GameSocket {
  private _movedUsers = new Set<string>();
  private _events: MonitoringEvent[] = [];

  constructor(
    readonly io: Server,
    readonly engine: Engine,
    readonly monitor: Monitor
  ) {
    io.of("screen").on("connection", (socket) => this._screenConnect(socket));
    io.of("control").on("connection", (socket) => this._controlConnect(socket));

    this.subscribe();
  }

  private subscribe() {
    let hasChange = false;
    this.engine.on("newPlayer").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "play",
        userID: player.socket?.id,
      });
      hasChange = true;
    });
    this.engine.on("playerLeave").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "leave",
        userID: player.socket?.id,
      });
      hasChange = true;
    });
    this.engine.on("playerMove").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "move",
        userID: player.socket?.id,
      });
      hasChange = true;
    });
    this.engine.on("newQuestion").subscribe((question) => {
      this._events.push({
        origin: "gameEngine",
        action: "newQuestion",
      });
      this.emitQuestion(question);
      hasChange = true;
    });
    this.engine.on("userAnswer").subscribe(({ player, answer }) => {
      this.monitor.send({
        origin: "user",
        action: "userAnswer",
        userID: player.socket?.id,
      } as UserEvent);
      this.emitResult(answer, player);
    });
    this.engine.on("answer").subscribe((answer) => {
      this.monitor.send({
        origin: "gameEngine",
        action: "answer",
      });
      this.emitResult(answer);
    });
    this.engine.on("state").subscribe(() => {
      hasChange = true;
      this.emitSetup();
    });

    const updateInterval = setInterval(() => {
      if (hasChange) {
        this.emitUpdates();
        this._events.forEach((event) => this.monitor.send(event));
        this._events = [];
      }
      hasChange = false;
      this._movedUsers = new Set<string>();
    }, config.MOVE_INTERVAL);
  }

  emitUpdates(opt?: { socket }) {
    let target = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("gameStateUpdate", {
      players: Object.values(this.engine.players).map((p) => {
        return {
          id: p.socket.id,
          x: p.x,
          y: p.y,
          inAnswer: p.inAnswer,
          laureate: p.laureate,
          previousPositions: p.previousPositions,
          status: p.status,
        };
      }),
      question: this.engine.currentQuestion,
    });

    Object.values(this.engine.players).forEach((p) => {
      let target = p.socket;
      target.emit("gameStateUpdate", {
        inQuestion: p.inAnswer,
      });
    })
  }

  emitSetup(opt?: { socket }) {
    let target = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("setup", this.engine.state);
  }

  emitQuestion(question: IQuestion) {
    this.io.of("control").emit("question", question);
    this.io.of("screen").emit("question", question);
  }

  emitResult(answer: IAnswer, player?: Player) {
    let target: Namespace | Socket = this.io.of("screen");
    if (player?.socket) target = player.socket;
    target.emit("answer", {
      question: this.engine.currentQuestion,
      answer: answer,
    });
  }

  private _screenConnect(socket: Socket) {
    console.log("Screen server connect");
    this.emitUpdates({ socket });
    this.emitSetup({ socket });

    socket.on("disconnect", () => this._screenDisconnect(socket));
  }

  private _screenDisconnect(socket: Socket) {
    console.log("Screen disconnected");
  }

  private _controlConnect(socket: Socket) {
    console.log("User connected: ", socket.id);

    socket.on("disconnect", () => this._controlDisconnect(socket));

    socket.on("start", (laureate) => {
      const player = this.engine.newPlayer(socket, laureate);

      player.socket = socket;

      socket.on("up", () => {
        if (this._movedUsers.has(socket.id)) return;
        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: 0, y: -1 });
      });
      socket.on("down", () => {
        if (this._movedUsers.has(socket.id)) return;
        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: 0, y: 1 });
      });
      socket.on("left", () => {
        if (this._movedUsers.has(socket.id)) return;
        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: -1, y: 0 });
      });
      socket.on("right", () => {
        if (this._movedUsers.has(socket.id)) return;
        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: 1, y: 0 });
      });
    });
  }

  private _controlDisconnect(socket) {
    console.log("User disconnected:", socket.id);
    this.engine.removePlayer(socket.id);
  }
}
