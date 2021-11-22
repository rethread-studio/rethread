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
        text: "no",
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
  player.previousPositions.push({ x: player.x, y: player.y });
  if (player.previousPositions.length > 4) {
    player.previousPositions.shift();
  }
  switch (player.status) {
    case "up":
      isValidPosition({ x: player.x, y: player.y - 1 })
        ? (player.y = player.y - 1)
        : (player.status = "right");
      break;
    case "down":
      isValidPosition({ x: player.x, y: player.y + 1 })
        ? (player.y = player.y + 1)
        : (player.status = "left");
      break;
    case "right":
      isValidPosition({ x: player.x + 1, y: player.y })
        ? (player.x = player.x + 1)
        : (player.status = "down");
      break;
    case "left":
      isValidPosition({ x: player.x - 1, y: player.y })
        ? (player.x = player.x - 1)
        : (player.status = "up");
      break;
    default:
      isValidPosition({ x: player.x + 1, y: player.y })
        ? (player.x = player.x + 1)
        : (player.status = "down");
      break;
  }
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
    drawPlayersShadow(dummyGameState.players);
    drawPreviousPosition(dummyGameState.players);
    await renderPlayers(dummyGameState.players);
  } else if (demoMode == "question") {
    renderQuestion(dummyGameState.question);
    renderAnswer(dummyGameState.question);
    drawPlayersShadow(dummyGameState.players);
    drawPreviousPosition(dummyGameState.players);
    await renderPlayers(dummyGameState.players);
  } else if (demoMode == "laser") {
    renderQuestion(dummyGameState.questionLaser);
    await drawLaserBg();
    drawPlayersShadow(dummyGameState.players);
    drawPreviousPosition(dummyGameState.players);
    await renderPlayers(dummyGameState.players);
  }
}

async function drawLaserBg() {
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
  renderImage(imageCache[imagePath], gWidth / 2, gHeight / 2, width * scale, height * scale, 0, 1);
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
    console.log("display laser")
    showQuestion(true);
    updateQuestion(dummyGameState.questionLaser);
  }
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
    _displayDemo();
  }, config.demoTimer);
}
