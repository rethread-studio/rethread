const socket = io("/screen");

const config = {
  dotSize: { small: 4, big: 8 },
  answerSize: { small: "60px", big: "100px" },
  questionTime: 4,
  dialogueImagePath: "/img/dialogue.png",
  emojiDuration: 2,
};

class Game {
  _page = null;
  _gameState = null;
  _hasChange = false;
  _currentQuestion = null;
  _laureates = {};
  endDate = null;
  gameCycle = true;
  emojis = {};

  _updateEvent = new subEvents.SubEvent();
  _pageEvent = new subEvents.SubEvent();
  _questionEvent = new subEvents.SubEvent();

  onUpdate(callback) {
    return this._updateEvent.subscribe(callback);
  }
  onPageChange(callback) {
    return this._pageEvent.subscribe(callback);
  }
  onQuestionChange(callback) {
    return this._questionEvent.subscribe(callback);
  }
  updateQuestion(question, endDate) {
    this.question = question;
    this.endDate = endDate;
  }

  async getLaureate(laureateID) {
    if (this._laureates[laureateID] != undefined)
      return this._laureates[laureateID];
    const laureate = await getLaureate(laureateID);
    this._laureates[laureateID] = laureate;
    return laureate;
  }

  get page() {
    return this._page;
  }

  set page(page) {
    const oldValue = this._page;
    if (
      this.setup == null ||
      this._gameState == null ||
      this._gameState.players == null ||
      this._gameState.players?.length == 0
    ) {
      this._page = "demo";
    } else {
      this._page = page;
    }
    if (oldValue != this._page) {
      this.hasChange = true;
      this._pageEvent.emit(this._page);
    }
  }

  get players() {
    return this.gameState?.players || [];
  }

  get gameState() {
    return this._gameState;
  }
  set gameState(gameState) {
    if (this._gameState == null) {
      this.updateQuestion(gameState.question, gameState.endDate);
    }
    this._gameState = gameState;
    this.hasChange = true;
    if (gameState.players?.length > 0) {
      if (this.page == "demo") {
        this.page = "play";
      }
    } else {
      this.page = "demo";
    }
  }

  get hasChange() {
    return this._hasChange;
  }
  set hasChange(hasChange) {
    const oldValue = this._hasChange;
    this._hasChange = hasChange;
    if (hasChange == true && oldValue == false) {
      this._updateEvent.emit();
    }
  }

  get question() {
    return this._currentQuestion;
  }

  set question(question) {
    this._currentQuestion = question;
    this._questionEvent.emit(question);
    this.hasChange = true;
    this.page = "question";
    if (this.page == "question") {
      setTimeout(() => {
        this.page = "play";
      }, config.questionTime * 1000);
    }
  }

  async start(setup) {
    this.config = await getConfig();
    this.setup = setup;
    initRender();
    this.page = "play";
  }
}

const game = new Game();

setInterval(() => {
  game.gameCycle = !game.gameCycle;
  game.hasChange = true;
}, 1000);

socket.on("setup", async (data) => await game.start(data));
socket.on("gameStateUpdate", (gameState) => (game.gameState = gameState));
socket.on("question", ({ question, endDate }) => {
  game.updateQuestion(question, endDate);
});
socket.on("answer", ({ question, answer }) => {
  game.page = "results";
});
socket.on("disconnect", () => {
  game.page = "demo";
});

const emojiTimeouts = {};
socket.on("emote", ({ playerId, emoji }) => {
  console.log(playerId, emoji);
  game.emojis[playerId] = emoji.emoji;
  game.hasChange = true;

  clearTimeout(emojiTimeouts[playerId]);
  emojiTimeouts[playerId] = setTimeout(() => {
    delete game.emojis[playerId];
    game.hasChange = true;
  }, config.emojiDuration * 1000);
});
