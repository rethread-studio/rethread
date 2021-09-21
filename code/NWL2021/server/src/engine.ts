import { SubEvent } from "sub-events";
import config from "../../config";

import QuestionModel from "./database/questions/questions.model";
import { IQuestion, IAnswer } from "./database/questions/questions.types";
import StateModel from "./database/state/state.model";
import { IStateDocument } from "./database/state/state.types";
import { BoxPosition, Player, Position } from "./types";

class Events {
  newPlayer = new SubEvent<Player>();
  userAnswer = new SubEvent<{ answer: IAnswer; player: Player }>();
  answer = new SubEvent<IAnswer>();
  playerMove = new SubEvent<Player>();
  playerLeave = new SubEvent<Player>();
  newQuestion = new SubEvent<IQuestion>();
}

export class Engine {
  private _questions: IQuestion[];
  private _currentQuestion: IQuestion;
  private _state: IStateDocument;
  private _players: { [key: string]: Player };
  private _events = new Events();

  constructor() {}

  async init() {
    this._questions = await QuestionModel.find();
    this._currentQuestion = this.chooseQuestionRandomly();
    this._state = await StateModel.findOne();
    this._players = {};

    const questionInterval = setInterval(() => {
      let answerScore = {};
      for (const answer of this.currentQuestion.answers) {
        answerScore[answer.text] = 0;
        for (const socketID of Object.keys(this.players)) {
          const player = this.players[socketID];
          if (this.checkCollision(player, answer.position)) {
            answerScore[answer.text]++;
            this._events.userAnswer.emit({ answer, player });
          }
        }
      }
      const selectedAnswer = this.currentQuestion.answers
        .filter((f) => answerScore[f.text])
        .sort((a, b) => answerScore[a.text] - answerScore[b.text]);
      if (selectedAnswer.length > 0) {
        this._events.answer.emit(selectedAnswer[0]);
      }

      setTimeout(() => {
        const newQuestion = this.chooseQuestionRandomly();
        this.currentQuestion = newQuestion;
      }, 3000);
    }, config.QUESTION_INTERVAL * 1000);
  }

  on<K extends keyof Events>(key: K) {
    return this._events[key];
  }

  chooseQuestionRandomly() {
    let newQuestion: IQuestion = null;
    do {
      newQuestion =
        this._questions[
          Math.round(Math.random() * (this._questions.length - 1))
        ];
    } while (
      this._currentQuestion &&
      newQuestion.text !== this._currentQuestion.text
    );
    return newQuestion;
  }

  checkCollision(player: Player, obj: Position) {
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

  newPlayer(id: string, laureate) {
    // get open position
    const player: Player = {
      x: 0,
      y: 0,
      laureate,
      inQuestion: false,
      socket: null,
    };

    while (!this.isValidPosition(player, id)) {
      player.x = Math.floor(Math.random() * this._state.width);
      player.y = Math.floor(Math.random() * this._state.height);
    }

    // add player to engine.players obj
    this._players[id] = player;
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
      position.y >= this._currentQuestion.position.y &&
      position.y <=
        this._currentQuestion.position.y + this._currentQuestion.position.height
    ) {
      if (
        position.x >= this._currentQuestion.position.x &&
        position.x <=
          this._currentQuestion.position.x +
            this._currentQuestion.position.width
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
      if (this.checkCollision(player, position)) {
        hasCollided = true;
        return; // don't bother checking other stuff
      }
    });
    if (hasCollided) {
      return false;
    }

    return true;
  }

  removePlayer(id) {
    this._events.playerLeave.emit(this._players[id]);
    delete this._players[id];
  }

  movePlayer(id: string, position: Position) {
    var player = this._players[id];
    var newPosition = {
      x: player.x + position.x,
      y: player.y + position.y,
    };
    if (this.isValidPosition(newPosition, id)) {
      // move the player and increment score
      player.x = newPosition.x;
      player.y = newPosition.y;

      let inQuestion: boolean = false;
      for (const answer of this._currentQuestion.answers) {
        if (this.checkCollision(player, answer.position)) {
          inQuestion = true;
          break;
        }
      }
      player.inQuestion = inQuestion;

      this._events.playerMove.emit(player);
    }
  }

  get currentQuestion() {
    return this._currentQuestion;
  }

  set currentQuestion(question) {
    this._currentQuestion = question;
    this._events.newQuestion.emit(question);
  }

  get state() {
    return this._state;
  }

  get players() {
    return this._players;
  }
}
