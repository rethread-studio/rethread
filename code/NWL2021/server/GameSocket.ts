import mongoose from "mongoose";
import { Namespace, Server, Socket } from "socket.io";
import config from "../config";
import EmojiModel from "./database/emojis/emojis.model";
import { IQuestion, IAnswer } from "./database/questions/questions.types";
import UserModel from "./database/users/users.model";
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
    io.of("control").on("disconnect", (socket) =>
      this._controlDisconnect(socket)
    );

    this.subscribe();
  }

  private subscribe() {
    this.engine.on("newPlayer").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "play",
        socketID: player.socket?.id,
        userID: player.userID,
      });
      this._hasChange = true;
    });
    this.engine.on("playerLeave").subscribe(({ userID, socketID }) => {
      this._events.push({
        origin: "user",
        action: "leave",
        socketID,
        userID,
      });
      this._hasChange = true;
    });
    this.engine.on("playerMove").subscribe((player) => {
      this._events.push({
        origin: "user",
        action: "move",
        userID: player.userID,
        socketID: player.socket?.id,
      });
      player.socket?.emit("move", { x: player.x, y: player.y });
      this._hasChange = true;
    });
    this.engine.on("hit").subscribe((player) => {
      this.emitHit({ userID: player.userID });
    });
    this.engine.on("score").subscribe(({ player, user }) => {
      player?.socket?.emit("score", Object.values(user.events).reduce((v, e) => e + v, 0));
    });
    this.engine.on("newQuestion").subscribe((questionEvent) => {
      this._events.push({
        origin: "gameEngine",
        action: "newQuestion",
      });
      this.emitQuestion(questionEvent);
      this._hasChange = true;
    });
    this.engine.on("userAnswer").subscribe(({ player, answer }) => {
      this.monitor.send({
        origin: "user",
        action: "userAnswer",
        userID: player.userID,
        socketID: player.socket?.id,
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
        userID: player.userID,
        socketID: player.socket?.id,
      });
      this.emitEnterAnswer(answer, player);
    });
    this.engine.on("exitAnswer").subscribe(({ answer, player }) => {
      this.monitor.send({
        origin: "user",
        action: "answer",
        userID: player.userID,
        socketID: player.socket?.id,
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

  emitUpdates(opt?: { socket?: Socket }) {
    let target: Socket | Namespace = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("gameStateUpdate", {
      players: Object.values(this.engine.players).map((p) => {
        return {
          socketID: p.socketID,
          userID: p.userID,
          x: p.x,
          y: p.y,
          inAnswer: p.inAnswer,
          laureateID: p.laureateID,
          previousPositions: p.previousPositions,
          status: p.status,
        };
      }),
      answerPositions:
        this.engine.state.answersPositions[
        this.engine.currentIndexAnswerPosition
        ],
      questionEndDate: this.engine.questionEndDate,
      question: this.engine.currentQuestion,
    });
  }

  emitSetup(opt?: { socket?: Socket }) {
    let target: Socket | Namespace = this.io.of("screen");
    if (opt?.socket) target = opt.socket;
    target.emit("setup", this.engine.state);
  }

  emitHit(userID: { userID: string }) {
    this.io.of("screen").emit("hit", {
      userID: userID.userID,
    });
  }

  async emitQuestion(questionEvent: { question: IQuestion; endDate: Date }) {
    for (const answer of questionEvent.question.answers) {
      answer.text = answer.text
        .replace("[random]", Math.round(Math.random() * 10000).toString())
        .replace("[nb_users]", (await UserModel.count()).toString());
    }
    this.io.of("control").emit("question", {
      question: questionEvent.question.text,
      answerPositions:
        this.engine.state.answersPositions[
        this.engine.currentIndexAnswerPosition
        ],
    });
    this.io.of("screen").emit("question", {
      question: questionEvent.question,
      endDate: questionEvent.endDate,
      answerPositions:
        this.engine.state.answersPositions[
        this.engine.currentIndexAnswerPosition
        ],
    });
  }

  emitResult(answer: IAnswer, player?: Player) {
    let target: Namespace | Socket = this.io.of("screen");
    if (player?.socket) target = player.socket;

    if (player) {
      const session: any = (player?.socket as any).session;
      if (session) {
        UserModel.findByIdAndUpdate(session.userID, {
          $inc: { "events.answer": 1 },
        }).then((user) => {
          this.engine.on("score").emit({ player, user });
        }, console.error);
      }
    }

    target.emit("answer", {
      question: this.engine.currentQuestion,
      answer: answer,
    });
  }

  emitEnterAnswer(answer: IAnswer, player: Player) {
    if (!answer) return;
    const target = player.socket;

    const session: any = (target.handshake as any).session;
    UserModel.findByIdAndUpdate(session.userID, {
      $inc: { "events.enterAnswer": 1 },
    }).then((user) => {
      this.engine.on("score").emit({ player, user });
    }, console.error);

    this._events.push({
      origin: "user",
      action: "enterAnswer",
      userID: player.userID,
      socketID: player.socket?.id,
    });
    target.emit("enterAnswer", {
      question: this.engine.currentQuestion,
      answer: answer.text,
    });
  }

  emitExitAnswer(answer: IAnswer, player: Player) {
    const target = player.socket;

    const session: any = (target.handshake as any).session;
    UserModel.findByIdAndUpdate(session.userID, {
      $inc: { "events.exitAnswer": 1 },
    }).then((user) => {
      this.engine.on("score").emit({ player, user });
    }, console.error);

    this._events.push({
      origin: "user",
      action: "exitAnswer",
      userID: player.userID,
      socketID: player.socket?.id,
    });
    target.emit("exitAnswer", {
      question: this.engine.currentQuestion,
    });
  }

  private _screenConnect(socket: Socket) {
    console.log("Screen server connect");
    this.emitUpdates({ socket });
    this.emitSetup({ socket });
    socket.emit("question", {
      question: this.engine.currentQuestion,
      endDate: this.engine.questionEndDate,
    });

    socket.on("disconnect", () => this._screenDisconnect(socket));
  }

  private _screenDisconnect(socket: Socket) {
    console.log("Screen disconnected");
  }

  private async _controlConnect(socket: Socket) {
    const gameSocket = this;
    const session: any = (socket.handshake as any).session;
    let isNew = false;
    if (session.userID) {
      const user = await UserModel.findById(session.userID);
      if (!user) {
        const user = new UserModel({
          _id: new mongoose.Types.ObjectId(session.userID),
        });
        await user.save();
      }
    }
    if (!session?.userID) {
      isNew = true;
      const user = new UserModel({ _id: new mongoose.Types.ObjectId() });
      session.userID = user._id;
      await Promise.all([session.save(), user.save()]);
    }
    socket.emit("welcome", {
      laureateID: session?.laureate,
      state: this.engine.state,
    });
    console.log(`[USER ${session.userID}] connected (isNew: ${isNew})`);

    let disconnectTimeout;

    function ping() {
      clearTimeout(disconnectTimeout);
      disconnectTimeout = setTimeout(() => {
        console.log(`[USER ${session.userID}] Inactive`);
        socket.emit("leave");
        gameSocket._controlDisconnect(socket);
      }, config.INACTIVITY_TIME * 1000);
    }
    ping();

    this._events.push({
      origin: "user",
      action: "new",
      userID: session.userID,
      socketID: socket.id,
    });

    socket.on("disconnect", () => this._controlDisconnect(socket));

    socket.on("click", (event) => {
      UserModel.findByIdAndUpdate(session.userID, {
        $inc: { "events.click": 1 },
      }).then((user) => { }, console.error);

      this.monitor.send({
        origin: "user",
        action: "click",
        userID: session.userID,
        socketID: socket.id,
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

      UserModel.findByIdAndUpdate(session.userID, {
        $inc: { "events.leave": 1 },
      }).then((user) => {
        this.engine
          .on("score")
          .emit({ player: this.engine.players[socket.id], user });
      }, console.error);

      this.engine.removePlayer(socket.id, session.userID);
      this._events.push({
        origin: "user",
        action: "leave",
        userID: session.userID,
        socketID: socket.id,
      });
    });

    socket.on("emote", async (emojiID) => {
      try {
        const emoji = await EmojiModel.findByIdAndUpdate(emojiID, {
          $inc: { used: 1 },
        });
        if (!emoji) return;
        UserModel.findByIdAndUpdate(session.userID, {
          $inc: { "events.emote": 1 },
        }).then((user) => {
          this.engine
            .on("score")
            .emit({ player: this.engine.players[socket.id], user });
        }, console.error);

        this._hasChange = true;
        this.io.of("screen").emit("emote", { playerId: socket.id, emoji });
        this._events.push({
          origin: "user",
          action: "emote",
          userID: session.userID,
          socketID: socket.id,
        });
        ping();
      } catch (e) {
        console.error(e);
        return;
      }
    });

    socket.on("start", (laureateID: string) => {
      session.laureate = laureateID;
      session.save();

      const player = this.engine.newPlayer(socket, laureateID, session.userID);

      UserModel.findByIdAndUpdate(session.userID, {
        $inc: { "events.play": 1 },
        $set: { laureateID },
      }).then((user) => {
        this.engine.on("score").emit({ player, user });
      }, console.error);

      this._events.push({
        origin: "user",
        action: "start",
        userID: session.userID,
        socketID: socket.id,
      });

      player.socket = socket;

      socket.emit("question", {
        question: this.engine.currentQuestion.text,
        answerPositions:
          this.engine.state.answersPositions[
          this.engine.currentIndexAnswerPosition
          ],
      });

      socket.on("up", () => {
        if (this._movedUsers.has(socket.id)) return;

        UserModel.findByIdAndUpdate(session.userID, {
          $inc: { "events.up": 1 },
        }).then((user) => {
          this.engine.on("score").emit({ player, user });
        }, console.error);

        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: 0, y: -1 });
        ping();
      });
      socket.on("down", () => {
        if (this._movedUsers.has(socket.id)) return;

        UserModel.findByIdAndUpdate(session.userID, {
          $inc: { "events.down": 1 },
        }).then((user) => {
          this.engine.on("score").emit({ player, user });
        }, console.error);

        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: 0, y: 1 });
        ping();
      });
      socket.on("left", () => {
        if (this._movedUsers.has(socket.id)) return;

        UserModel.findByIdAndUpdate(session.userID, {
          $inc: { "events.left": 1 },
        }).then((user) => {
          this.engine.on("score").emit({ player, user });
        }, console.error);

        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: -1, y: 0 });
        ping();
      });
      socket.on("right", () => {
        if (this._movedUsers.has(socket.id)) return;

        UserModel.findByIdAndUpdate(session.userID, {
          $inc: { "events.right": 1 },
        }).then((user) => {
          this.engine.on("score").emit({ player, user });
        }, console.error);

        this._movedUsers.add(socket.id);
        this.engine.movePlayer(socket.id, { x: 1, y: 0 });
        ping();
      });
    });
  }

  private _controlDisconnect(socket) {
    const session: any = (socket.handshake as any).session;
    console.log(`[USER ${session?.userID}] Disconnected`);
    this.engine.removePlayer(socket.id, session?.userID);
  }
}
