import * as engine from "./engine";
import { Server, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export default class GameSocket {
  constructor(readonly io: Server) {
    io.of("screen").on("connection", (socket) => this._screenConnect(socket));
    io.of("control").on("connection", (socket) => this._controlConnect(socket));
  }

  emitUpdates(opt?: { socket }) {
    let target = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("gameStateUpdate", {
      players: engine.state.players,
      question: engine.state.question,
    });
  }

  emitSetup(opt?: { socket }) {
    let target = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("setup", {
      boxSize: engine.boxSize,
      gameSize: engine.gameSize,
    });
  }

  private _screenConnect(socket: Socket) {
    console.log("Screen server connect")
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
      const player = engine.newPlayer(socket.id, laureate);
      socket.emit("init", player);
      
      socket.on("up", () => engine.movePlayer(socket.id, { x: 0, y: -1 }));
      socket.on("down", () => engine.movePlayer(socket.id, { x: 0, y: 1 }));
      socket.on("left", () => engine.movePlayer(socket.id, { x: -1, y: 0 }));
      socket.on("right", () => engine.movePlayer(socket.id, { x: 1, y: 0 }));
    });
  }
  private _controlDisconnect(socket) {
    console.log("User disconnected:", socket.id);
    delete engine.state.players[socket.id];
    this.emitUpdates();
  }
}
