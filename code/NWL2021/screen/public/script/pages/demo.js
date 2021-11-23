let demoLaureates = [];

const dummyPlayer1 = {
  inAnswer: false,
  status: "right",
  x: 0,
  y: 0,
  laureateID: "615ee06a28f1bb00b8c4c8e7",
  previousPositions: [],
};

const dummyPlayer2 = {
  inAnswer: false,
  status: "left",
  x: 0,
  y: 0,
  laureateID: "615ee06a28f1bb00b8c4c8e4",
  previousPositions: [],
};

const dummyGameState = {
  players: [dummyPlayer1, dummyPlayer2],
  question: {
    text: "Do you want to play?",
    answers: [
      {
        isCorrect: true,
        text: "yes",
      },
      {
        isCorrect: false,
        text: "ja",
      },
    ],
  },
  questionLaser: {
    text: "See the invisible",
    answers: [
      {
        isCorrect: true,
        text: "yes",
      },
      {
        isCorrect: false,
        text: "no",
      },
    ],
  },
};

async function getDemoLaureates() {
  demoLaureates = await getLaureates();
  assignRandomLaureate();
}

function initDemo() {
  getDemoLaureates();
}

function assignRandomLaureate() {
  const list = demoLaureates.filter(
    (l) => l._id != dummyPlayer1.laureateID && l._id != dummyPlayer2.laureateID
  );
  const pos1 = Math.floor(Math.random() * list.length);
  const pos2 =
    (pos1 + (Math.floor(Math.random() * (list.length - 2)) + 1)) % list.length;
  dummyPlayer2.laureate = list[pos2];
  dummyPlayer2.laureateID = list[pos2]._id;
  dummyPlayer1.laureate = list[pos1];
  dummyPlayer1.laureateID = list[pos1]._id;
}

function isValidPosition(position) {
  if (position.x < 0 || position.x >= game.setup.width) {
    return false;
  }
  if (position.y < 0 || position.y >= game.setup.height) {
    return false;
  }
  return true;
}

function moveDummyPlayer(player) {
  const newPosition = { x: player.x, y: player.y };
  if (player.status == "up") {
    newPosition.y--;
  } else if (player.status == "down") {
    newPosition.y++;
  } else if (player.status == "left") {
    newPosition.x--;
  } else if (player.status == "right") {
    newPosition.x++;
  }

  if (isValidPosition(newPosition)) {
    player.previousPositions.push({ x: player.x, y: player.y });
    if (player.previousPositions.length > 4) {
      player.previousPositions.shift();
    }

    player.x = newPosition.x;
    player.y = newPosition.y;
  } else {
    player.status =
      player.status == "up"
        ? "right"
        : player.status == "down"
          ? "left"
          : player.status == "left"
            ? "up"
            : "down";
    moveDummyPlayer(player);
  }
}

function changeOrientation(player) {
  player.status =
    player.status == "up"
      ? "down"
      : player.status == "down"
        ? "up"
        : player.status == "left"
          ? "right"
          : "left";
}
function randomPosition() {
  dummyPlayer1.x = 0;
  dummyPlayer1.y = 0;
  dummyPlayer1.previousPositions = [];
  dummyPlayer2.x = game.setup.width - 1;
  dummyPlayer2.y = game.setup.height - 1;
  dummyPlayer2.previousPositions = [];
}
setInterval(() => {
  if (!game.setup) return;
  for (const player of dummyGameState.players) {
    moveDummyPlayer(player);
  }
}, 1000);

async function renderDemo() {
  if (!game.setup) return;

  if (demoMode == "info") {
    await drawPreviousPosition(dummyGameState.players);
    await drawPlayersShadow(dummyGameState.players);
    await renderPlayers(dummyGameState.players);
  } else if (demoMode == "question") {
    renderQuestion(dummyGameState.question);
    renderAnswer(dummyGameState.question);
    await drawPreviousPosition(dummyGameState.players);
    await drawPlayersShadow(dummyGameState.players);
    await renderPlayers(dummyGameState.players);
  } else if (demoMode == "laser") {
    renderQuestion(dummyGameState.questionLaser);
    drawLaserBg();
    await drawPreviousPosition(dummyGameState.players);
    await drawPlayersShadow(dummyGameState.players);
    await renderPlayers(dummyGameState.players);
  }
}

function drawLaserBg() {
  const gWidth = game.setup.unitSize * game.setup.width;
  const gHeight = game.setup.unitSize * game.setup.height;

  const width = 1920;
  const height = 1080;

  const scale = Math.max(gWidth / width, gHeight / height);
  const imagePath = `/img/laserBg.jpg`;
  if (!imageCache[imagePath]) {
    imageCache[imagePath] = new Image(width, height);
    imageCache[imagePath].src = imagePath;
  }
  renderImage(
    imageCache[imagePath],
    gWidth / 2,
    gHeight / 2,
    width * scale,
    height * scale,
    0,
    1
  );
}

function _displayDemo() {
  hideAll();
  if (demoMode == "info") {
    showDemo(true);
  } else if (demoMode == "question") {
    showQuestion(true);
    showAnswers(true);
    updateQuestion(dummyGameState.question);
  } else if (demoMode == "laser") {
    showQuestion(true);
    updateQuestion(dummyGameState.questionLaser);
  }
  renderDemo();
}

let demoMode = "info";
const demoModes = ["info", "question", "info", "laser"];
let demoPos = 0;

let demoInterval = null;
function displayDemo() {
  demoMode = "info";
  _displayDemo();
  clearInterval(demoInterval);
  demoInterval = setInterval(() => {
    demoMode = demoModes[(demoPos + 1) % demoModes.length];
    demoPos++;
    assignRandomLaureate();
    if (demoPos % 15 == 0) {
      changeOrientation(dummyPlayer1);
      changeOrientation(dummyPlayer2);
      // randomPosition();
    }
    _displayDemo();
  }, config.demoTimer);
}
