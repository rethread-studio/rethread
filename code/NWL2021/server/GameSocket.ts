import { Namespace, Server, Socket } from "socket.io";
import config from "../config";
import { IQuestion, IAnswer } from "./database/questions/questions.types";
import { Engine } from "./engine";
import Monitor from "./Monitor";
import { MonitoringEvent, Player, UserEvent } from "./types";

export default class GameSocket {
  private _movedUsers = new Set<string>();
  private _events: MonitoringEvent[] = [];
  private _hasChange = false;
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
    this.engine.on("newPlayer").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "play",
        userID: player.socket?.id,
      });
      this._hasChange = true;
    });
    this.engine.on("playerLeave").subscribe((playerId) => {
      this._events.push({
        origin: "user",
        action: "leave",
        userID: playerId,
      });
      this._hasChange = true;
    });
    this.engine.on("playerMove").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "move",
        userID: player.socket?.id,
      });
      this._hasChange = true;
    });
    this.engine.on("newQuestion").subscribe((question) => {
      this._events.push({
        origin: "gameEngine",
        action: "newQuestion",
      });
      this.emitQuestion(question);
      this._hasChange = true;
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
    this.engine.on("enterAnswer").subscribe(({ answer, player }) => {
      this.monitor.send({
        origin: "user",
        action: "answer",
        userID: player.socket?.id,
      });
      this.emitEnterAnswer(answer, player);
    });
    this.engine.on("exitAnswer").subscribe(({ answer, player }) => {
      this.monitor.send({
        origin: "user",
        action: "answer",
        userID: player.socket?.id,
      });
      this.emitExitAnswer(answer, player);
    });
    this.engine.on("state").subscribe(() => {
      this._hasChange = true;
      this.emitSetup();
    });

    const updateInterval = setInterval(() => {
      if (this._hasChange) {
        this._events.push({
          origin: "gameEngine",
          action: "stateChanged",
        });
        this.emitUpdates();
        this._events.forEach((event) => this.monitor.send(event));
        this._events = [];
      }
      this._hasChange = false;
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
  }

  emitSetup(opt?: { socket }) {
    let target = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("setup", this.engine.state);
  }

  emitQuestion(question: IQuestion) {
    this.io.of("control").emit("question", question.text);
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

  emitEnterAnswer(answer: IAnswer, player: Player) {
    const target = player.socket;
    this._events.push({
      origin: "user",
      action: "enterAnswer",
      userID: player.socket.id,
    });
    target.emit("enterAnswer", {
      question: this.engine.currentQuestion,
      answer: answer.text,
    });
  }

  emitExitAnswer(answer: IAnswer, player: Player) {
    const target = player.socket;
    this._events.push({
      origin: "user",
      action: "exitAnswer",
      userID: player.socket.id,
    });
    target.emit("exitAnswer", {
      question: this.engine.currentQuestion,
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
    const gameSocket = this;
    const session: any = (socket.handshake as any).session;
    socket.emit("welcome", session?.laureate);
    console.log("User connected: ", socket.id);

    let disconnectTimeout;


    function ping() {
      clearTimeout(disconnectTimeout);
      disconnectTimeout = setTimeout(() => {
        console.log("inactive")
        socket.emit("leave");
        gameSocket._controlDisconnect(socket);
      }, 30000);
    }
    ping();

    this._events.push({
      origin: "user",
      action: "new",
      userID: socket.id,
    });

    socket.on("disconnect", () => this._controlDisconnect(socket));

    socket.on("click", (event) => {
      this.monitor.send({
        origin: "user",
        action: "click",
        userID: socket.id,
        position: {
          x: event.x,
          y: event.y,
        },
      });
      ping();
    });

    socket.on("leave", () => {
      session.laureate = null;
      session.save();
      this.engine.removePlayer(socket.id);
      this._events.push({
        origin: "user",
        action: "leave",
        userID: socket.id,
      });
    });

    socket.on("emote", () => {
      this._hasChange = true;
      this.io.of("screen").emit("emote", socket.id);
      this._events.push({
        origin: "user",
        action: "emote",
        userID: socket.id,
      });
    });

    socket.on("start", (laureate) => {
      session.laureate = laureate;
      session.save();
      const player = this.engine.newPlayer(socket, laureate);

      this._events.push({
        origin: "user",
        action: "start",
        userID: socket.id,
      });

      player.socket = socket;

      socket.emit("question", this.engine.currentQuestion.text);

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
