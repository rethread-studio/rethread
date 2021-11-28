import { Socket } from "socket.io";
import { SubEvent } from "sub-events";
import config from "../config";
import { ILaureate } from "./database/laureates/laureates.types";
import LaureateModel from "./database/laureates/laureates.model";

import QuestionModel from "./database/questions/questions.model";
import { IQuestion, IAnswer } from "./database/questions/questions.types";
import StateModel from "./database/state/state.model";
import { IStateDocument } from "./database/state/state.types";
import { BoxPosition, Player, Position } from "./types";
import mongoose from "mongoose";
import { IUser } from "./database/users/users.types";
import UserModel from "./database/users/users.model";

class Events {
  newPlayer = new SubEvent<Player>();
  userAnswer = new SubEvent<{ answer: IAnswer; player: Player }>();
  enterAnswer = new SubEvent<{ answer: IAnswer; player: Player }>();
  exitAnswer = new SubEvent<{ answer: IAnswer; player: Player }>();
  answer = new SubEvent<IAnswer>();
  playerMove = new SubEvent<Player>();
  playerLeave = new SubEvent<{ socketID: string; userID: string }>();
  newQuestion = new SubEvent<{ question: IQuestion; endDate: Date }>();
  state = new SubEvent<IStateDocument>();
  score = new SubEvent<{ player: Player; user: IUser }>();
  hit = new SubEvent<Player>();
}

export class Engine {
  questions: IQuestion[];
  currentIndexAnswerPosition: number = 0;
  private _currentQuestion: IQuestion;
  private _questionEndDate: Date;
  private _currentIndexQuestion: number = 0;
  private _state: IStateDocument;
  private _players: { [key: string]: Player };
  private _events = new Events();
  private _questionTimeout = null;

  constructor() { }

  async init() {
    this.questions = (await QuestionModel.find()).sort((a, b) =>
      Math.random() > 0.5 ? 1 : -1
    );
    this.currentQuestion = this.chooseQuestion();
    this._state = await StateModel.findOne();
    this._players = {};
  }

  on<K extends keyof Events>(key: K) {
    return this._events[key];
  }

  chooseQuestion() {
    this._currentIndexQuestion++;
    if (this._currentIndexQuestion >= this.questions.length) {
      this._currentIndexQuestion = 0;
    }
    return this.questions[this._currentIndexQuestion];
  }

  newPlayer(socket: Socket, laureateID: string, userID: string) {
    const player: Player = {
      x: 0,
      y: 0,
      laureateID,
      inAnswer: false,
      socket,
      socketID: socket.id,
      userID,
      previousPositions: [],
      status: "idle",
    };
    LaureateModel.findByIdAndUpdate(laureateID, { $inc: { used: 1 } }).then(
      () => { },
      () => { }
    );

    // get open position
    while (!this.isValidPosition(player, socket.id)) {
      player.x = Math.floor(Math.random() * this._state.width);
      player.y = Math.floor(Math.random() * this._state.height);
    }

    // add player to engine.players obj
    this._players[socket.id] = player;
    this._events.newPlayer.emit(player);
    return player;
  }

  isValidPosition(position: Position, playerId: string) {
    // bounds check
    if (position.x < 0 || position.x >= this._state.width) {
      return false;
    }
    if (position.y < 0 || position.y >= this._state.height) {
      return false;
    }

    if (
      position.y >= this.state.questionPosition.y &&
      position.y <=
      this.state.questionPosition.y + this.state.questionPosition.height
    ) {
      if (
        position.x >= this.state.questionPosition.x &&
        position.x <=
        this.state.questionPosition.x + this.state.questionPosition.width
      ) {
        return false;
      }
    }

    for (const wall of this._state.walls) {
      if (position.y >= wall.y && position.y <= wall.y + wall.height) {
        if (position.x >= wall.x && position.x <= wall.x + wall.width) {
          return false;
        }
      }
    }

    // collision check
    var hasCollided = false;

    Object.keys(this._players).forEach((key) => {
      if (key == playerId) {
        return;
      } // ignore current player in collision check
      const player = this._players[key];
      // if the state.players overlap. hope this works
      if (Engine.checkCollision(player, position)) {
        hasCollided = true;
        return; // don't bother checking other stuff
      }
    });
    if (hasCollided) {
      return false;
    }

    return true;
  }

  removePlayer(socketID: string, userID: string) {
    this._events.playerLeave.emit({
      socketID,
      userID,
    });
    delete this._players[socketID];
  }

  private _isInAnswer(player: Player) {
    for (
      let i = 0;
      i < this.state.answersPositions[this.currentIndexAnswerPosition].length;
      i++
    ) {
      const answer = this.currentQuestion.answers[i];
      const position =
        this.state.answersPositions[this.currentIndexAnswerPosition][i];
      if (Engine.checkCollision(player, position)) {
        return { inAnswer: true, answer };
      }
    }
    return { inAnswer: false, answer: null };
  }

  movePlayer(id: string, position: Position) {
    var player = this._players[id];
    if (!player) return;
    var newPosition = {
      x: player.x + position.x,
      y: player.y + position.y,
    };
    if (this.isValidPosition(newPosition, id)) {
      //add the previous position
      player.previousPositions.push({ x: player.x, y: player.y });
      if (player.previousPositions.length > 4) {
        player.previousPositions.shift();
      }
      // move the player and increment score
      player.status =
        player.x < newPosition.x
          ? "right"
          : player.x > newPosition.x
            ? "left"
            : "idle";
      player.x = newPosition.x;
      player.y = newPosition.y;

      const oldInAnswer = player.inAnswer;
      const { inAnswer, answer } = this._isInAnswer(player);
      player.inAnswer = inAnswer;

      if (oldInAnswer === false && player.inAnswer === true) {
        this._events.enterAnswer.emit({ answer, player });
      } else if (oldInAnswer === true && player.inAnswer === false) {
        this._events.exitAnswer.emit({ answer, player });
      }

      this._events.playerMove.emit(player);
    } else {
      player.status = "hit";
      this._events.hit.emit(player);
      this._events.playerMove.emit(player);
      if (player.previousPositions.length > 0) {
        player.previousPositions.shift();
      }
    }
  }

  static checkCollision(player: Player, obj: Position) {
    if ((obj as any).width !== undefined) {
      const position: BoxPosition = obj as BoxPosition;
      return (
        player.x >= position.x &&
        player.x <= position.x + position.width &&
        player.y >= position.y &&
        player.y <= position.y + position.height
      );
    }
    return player.x == obj.x && player.y == obj.y;
  }

  get currentQuestion() {
    return this._currentQuestion;
  }

  set currentQuestion(question) {
    clearTimeout(this._questionTimeout);

    for (const socketID of Object.keys(this.players || {})) {
      const player = this.players[socketID];
      const { inAnswer, answer } = this._isInAnswer(player);
      if (!inAnswer) continue;
      this._events.userAnswer.emit({ answer, player });
    }
    if (this._currentQuestion) {
      const selectedAnswer = this._currentQuestion.answers.filter(
        (f) => f.isCorrect
      );
      this._events.answer.emit(selectedAnswer[0]);
    }

    this._currentQuestion = question;
    this._questionEndDate = new Date();
    this._questionEndDate.setSeconds(
      this._questionEndDate.getSeconds() + config.QUESTION_INTERVAL
    );

    setTimeout(() => {
      this._events.newQuestion.emit({
        question,
        endDate: this._questionEndDate,
      });

      for (const socketID of Object.keys(this.players)) {
        const player = this.players[socketID];
        const { inAnswer, answer } = this._isInAnswer(player);
        if (player.inAnswer && !inAnswer) {
          this._events.exitAnswer.emit({ answer, player });
        } else if (inAnswer) {
          this._events.enterAnswer.emit({ answer, player });
        }
        player.inAnswer = inAnswer;
      }
    }, config.ANSWER_DURATION * 1000);

    this._questionTimeout = setTimeout(() => {
      this.currentQuestion = this.chooseQuestion();
      this.currentIndexAnswerPosition =
        (this.currentIndexAnswerPosition + 1) %
        this.state.answersPositions.length;
    }, config.QUESTION_INTERVAL * 1000);
  }

  get questionEndDate() {
    return this._questionEndDate;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this._events.state.emit(state);
  }

  get players() {
    return this._players;
  }

}
