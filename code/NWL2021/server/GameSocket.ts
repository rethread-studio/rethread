import { Server, Socket } from "socket.io";
import { IQuestion, IAnswer } from "./database/questions/questions.types";
import { Engine } from "./engine";
import { Player } from "./types";

export default class GameSocket {
  constructor(readonly io: Server, readonly engine: Engine) {
    io.of("screen").on("connection", (socket) => this._screenConnect(socket));
    io.of("control").on("connection", (socket) => this._controlConnect(socket));

    this.subscribe();
  }

  private subscribe() {
    let hasChange = false;
    this.engine.on("newPlayer").subscribe(() => (hasChange = true));
    this.engine.on("playerLeave").subscribe(() => (hasChange = true));
    this.engine.on("playerMove").subscribe(() => (hasChange = true));
    this.engine.on("newQuestion").subscribe((question) => {
      this.emitQuestion(question);
      hasChange = true;
    });
    this.engine.on("userAnswer").subscribe(({ player, answer }) => {
      this.emitResult(answer, player);
    });
    this.engine.on("answer").subscribe((answer) => {
      this.emitResult(answer);
    });
    this.engine.on("state").subscribe(() => {
      this.emitSetup();
    });

    const updateInterval = setInterval(() => {
      if (hasChange) {
        this.emitUpdates();
      }
      hasChange = false;
    }, 250);
  }

  emitUpdates(opt?: { socket }) {
    let target = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("gameStateUpdate", {
      players: Object.values(this.engine.players).map((p) => {
        return {
          x: p.x,
          y: p.y,
          inQuestion: p.inQuestion,
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
    this.io.of("control").emit("question", question);
    this.io.of("screen").emit("question", question);
  }

  emitResult(answer: IAnswer, player?: Player) {
    let target = this.io.of("screen");
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
      const player = this.engine.newPlayer(socket.id, laureate);

      player.socket = socket;

      socket.on("up", () => this.engine.movePlayer(socket.id, { x: 0, y: -1 }));
      socket.on("down", () =>
        this.engine.movePlayer(socket.id, { x: 0, y: 1 })
      );
      socket.on("left", () =>
        this.engine.movePlayer(socket.id, { x: -1, y: 0 })
      );
      socket.on("right", () =>
        this.engine.movePlayer(socket.id, { x: 1, y: 0 })
      );
    });
  }

  private _controlDisconnect(socket) {
    console.log("User disconnected:", socket.id);
    this.engine.removePlayer(socket.id);
  }
}
