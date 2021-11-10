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
  }
}

function _displayDemo() {
  hideAll();
  if (demoMode == "info") {
    showDemo(true);
  } else if (demoMode == "question") {
    showQuestion(true);
    showAnswers(true);
    updateQuestion(dummyGameState.question);
  }
}
let demoMode = "info";
const demoModes = ["info", "question"];
let demoInterval = null;
function displayDemo() {
  demoMode = "info";
  _displayDemo();
  clearInterval(demoInterval);
  demoInterval = setInterval(() => {
    demoMode = demoModes[(demoModes.indexOf(demoMode) + 1) % demoModes.length];
    _displayDemo();
  }, 6000);
}
