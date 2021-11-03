var socket = io("/screen");
socket.on("setup", (data) => {
  start(data);
});

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

socket.on("gameStateUpdate", (data) => {
  gameState = data;
  updateGameState();
});

socket.on("question", ({ question, answer }) => {
  const answerE = document.querySelector(".questionAnswer");
  answerE.style = "display: none;";
});

socket.on("answer", ({ question, answer }) => {
  const answerE = document.querySelector(".questionAnswer");
  answerE.style = "display: block;";
  answerE.innerHTML = `<div class="q">${question.text}</div><div class="a">${answer.text}</div>`;
});

const emotes = {};
socket.on("emote", (playerId) => {
  clearTimeout(emotes[playerId]);
  emotes[playerId] = setTimeout(() => delete emotes[playerId], 1000);
});

const imgs = {};
const shadows = {};
let gameCycle = true;
let setup, gameState;

function getAngle(playerStatus) {
  switch (playerStatus) {
    case "left":
      return -Math.PI / 4;
    case "right":
      return Math.PI / 4;
    case "up" || "down" || "iddle":
      return 0;
    case "hit":
      return Math.PI;
    default:
      return 0;
  }
}

function drawDialogue(players) {
  if (!players) return;

  const scale = 1; // gameCycle ? 1 : 0.8;
  // draw players
  Object.keys(players).forEach((playerId) => {
    let player = players[playerId];
    if (imgs[player.laureate.dialogue] && player.inAnswer) {
      renderImage(
        player.x * setup.unitSize + setup.unitSize / 2,
        player.y * setup.unitSize + setup.unitSize / 2,
        setup.unitSize,
        setup.unitSize,
        0,
        scale,
        imgs[player.laureate.dialogue]
      );
    } else {
      imgs[player.laureate.dialogue] = new Image(
        setup.unitSize,
        setup.unitSize
      );
      // Load an image of intrinsic size 300x227 in CSS pixels
      imgs[player.laureate.dialogue].src = "/img/dialogue.png";
      imgs[player.laureate.dialogue].onload = function () {
        if (player.inAnswer) {
          renderImage(
            player.x * setup.unitSize + setup.unitSize / 2,
            player.y * setup.unitSize + setup.unitSize / 2,
            setup.unitSize,
            setup.unitSize,
            0,
            scale,
            imgs[player.laureate.dialogue]
          );
        }
      };
    }
  });
}

function drawPlayers(players) {
  if (!players) return;

  let scale = 1; //gameCycle ? 1 : 0.8;
  // draw players

  for (const player of players) {
    let size = setup.unitSize;
    if (emotes[player.id]) {
      size *= new Date().getTime() % 2 ? 1.5 : 1.2;
    }
    if (imgs[player.laureate.imagePath]) {
      const angle = getAngle(player.status);
      renderImage(
        player.x * setup.unitSize + setup.unitSize / 2,
        player.y * setup.unitSize + setup.unitSize / 2,
        size,
        size,
        angle,
        scale,
        imgs[player.laureate.imagePath]
      );
    } else {
      imgs[player.laureate.imagePath] = new Image(
        setup.unitSize,
        setup.unitSize
      );
      // Load an image of intrinsic size 300x227 in CSS pixels
      imgs[
        player.laureate.imagePath
      ].src = `/img/laureates/${player.laureate.imagePath}`;

      imgs[player.laureate.imagePath].onload = function () {
        renderImage(
          player.x * setup.unitSize + setup.unitSize / 2,
          player.y * setup.unitSize + setup.unitSize / 2,
          size,
          size,
          0,
          scale,
          imgs[player.laureate.imagePath]
        );
      };
    }
  }
}

function renderImage(x, y, width, height, angle, scale = 1, image) {
  const centerX = width / 2.0;
  const centerY = height / 2.0;

  ctx.translate(x, y);

  ctx.rotate(angle);
  ctx.scale(scale, scale);
  // ctx.translate(x,y);
  ctx.drawImage(image, -centerX, -centerY, width, height);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function drawPlayersShadow(players) {
  if (!players) return;
  const boardState = gameCycle ? 1 : -1;
  // draw players
  Object.keys(players).forEach((playerId) => {
    let player = players[playerId];

    if (shadows[player.laureate.shadowImg]) {
      Object.keys(players).forEach((playerId) => {
        let player = players[playerId];
        let positions = player.previousPositions;
        if (positions.length == 0) return;
        for (let i = 0; i < positions.length; i++) {
          const x = positions[i].x * setup.unitSize + setup.unitSize / 2;
          const y = positions[i].y * setup.unitSize + setup.unitSize / 2;
          const widthHeight = setup.unitSize;
          const side = i % 2 == 0 ? 1 : -1;
          const angle = (Math.PI / 4) * side * boardState;
          renderImage(
            x,
            y,
            widthHeight,
            widthHeight,
            angle,
            0.8,
            shadows[player.laureate.shadowImg]
          );
        }
      });
    } else {
      shadows[player.laureate.shadowImg] = new Image(
        setup.unitSize,
        setup.unitSize
      );
      // Load an image of intrinsic size 300x227 in CSS pixels
      shadows[player.laureate.shadowImg].src = "/img/laureateShadow.png";
      shadows[player.laureate.shadowImg].onload = function () {
        Object.keys(players).forEach((playerId) => {
          let player = players[playerId];
          let positions = player.previousPositions;
          if (positions.length == 0) return;
          for (let i = 0; i < positions.length; i++) {
            const x = positions[i].x * setup.unitSize + setup.unitSize / 2;
            const y = positions[i].y * setup.unitSize + setup.unitSize / 2;
            const widthHeight = setup.unitSize;
            const side = i % 2 == 0 ? 1 : -1;
            const angle = (Math.PI / 4) * side * boardState;
            renderImage(
              x,
              y,
              widthHeight,
              widthHeight,
              angle,
              0.8,
              shadows[player.laureate.shadowImg]
            );
          }
        });
      };
    }
  });
}

function drawPreviousPosition(players) {
  if (!players) return;
  Object.keys(players).forEach((playerId) => {
    let player = players[playerId];
    let positions = player.previousPositions;
    if (positions.length == 0) return;

    //DRAW LINE PATH
    ctx.beginPath();
    ctx.lineWidth = !gameCycle ? "4" : "2";
    ctx.strokeStyle = player.laureate.color;
    ctx.moveTo(
      positions[0].x * setup.unitSize + setup.unitSize / 2,
      positions[0].y * setup.unitSize + setup.unitSize / 2
    );
    for (let i = 1; i < positions.length; i++) {
      ctx.lineTo(
        positions[i].x * setup.unitSize + setup.unitSize / 2,
        positions[i].y * setup.unitSize + setup.unitSize / 2
      );
    }
    ctx.lineTo(
      player.x * setup.unitSize + setup.unitSize / 2,
      player.y * setup.unitSize + setup.unitSize / 2
    );
    ctx.stroke();

    //DRAW PREVIOUS POSITION POINTS
    for (let i = 0; i < positions.length; i++) {
      ctx.fillStyle = player.laureate.color;
      ctx.beginPath();
      ctx.arc(
        positions[i].x * setup.unitSize + setup.unitSize / 2,
        positions[i].y * setup.unitSize + setup.unitSize / 2,
        !gameCycle ? "6" : "4",
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  });
}

function drawQuestion(question) {
  if (!question) return;
  const questionE = document.querySelector(".question");
  questionE.innerHTML = question.text;
  questionE.style = `top: ${setup.questionPosition.y * setup.unitSize
    }px;`;
  //draw the mid point
  for (let i = 0; i < setup.questionPosition.width + 1; i++) {
    for (let j = 0; j < setup.questionPosition.height + 1; j++) {
      ctx.fillStyle = "white";
      ctx.beginPath();
      ctx.arc(
        setup.questionPosition.x * setup.unitSize + setup.unitSize * i + setup.unitSize / 2,
        setup.questionPosition.y * setup.unitSize + setup.unitSize * j + setup.unitSize / 2,
        gameCycle ? "2" : "4",
        0,
        2 * Math.PI
      );
      ctx.fill();
    }
  }
}

function drawAnswers(question) {
  if (!question) return;

  const questionE = document.querySelector(".question");
  questionE.innerHTML = "";

  for (let i = 0; i < question.answers.length; i++) {
    const answer = question.answers[i];
    const position = setup.answersPositions[i];

    const answerE = document.querySelector(".answer" + (i + 1));
    answerE.innerHTML = answer.text;

    answerE.style = `top: ${position.y * setup.unitSize}px;left: ${position.x * setup.unitSize
      }px; width: ${(position.width + 1) * setup.unitSize}px; height: ${(position.height + 1) * setup.unitSize
      }px`;

    //draw the mid point
    for (let i = 0; i < position.width + 1; i++) {
      for (let j = 0; j < position.height + 1; j++) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
          position.x * setup.unitSize + setup.unitSize * i + setup.unitSize / 2,
          position.y * setup.unitSize + setup.unitSize * j + setup.unitSize / 2,
          gameCycle ? "2" : "4",
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }
  }
}

function showAnswers(_show) {
  const answerE1 = document.querySelector(".answer1");
  const answerE2 = document.querySelector(".answer2");
  answerE1.style.display = _show ? 'block' : 'none';
  answerE2.style.display = _show ? 'block' : 'none';
}

function showResults(_show) {
  const results = document.querySelector(".result");
  results.style.display = _show ? 'block' : 'none';
}

function showQuestion(_show) {
  const results = document.querySelector(".question");
  results.style.display = _show ? 'block' : 'none';
}

function showDemo(_show) {
  const results = document.querySelector(".demo");
  results.style.display = _show ? 'flex' : 'none';
}

function getCBoardClass() {
  return gameCycle ? "chess1" : "chess2";
}

function drawBoard() {
  const game = document.getElementById("game");
  game.classList.remove(getCBoardClass());
  game.classList.add(getCBoardClass());
}

setInterval(() => {
  gameCycle = !gameCycle;
}, 1000);

window.requestAnimationFrame(gameLoop);
function gameLoop() {
  updateGameState();
}

function updateGameState() {
  if (!gameState) gameState = {};
  //clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  //render status
  // const status = gameState.status;
  const status = "play";
  switch (status) {
    case "demo":
      showResults(false);
      showAnswers(false);
      showQuestion(false);
      showDemo(true);
      renderDemo();
      break;
    case "play":
      showAnswers(true);
      showDemo(false);
      renderGame();
      break;
    case "question":
      showAnswers(false);
      showResults(false);
      showQuestion(true);
      drawQuestion(gameState.question);
      break;
    case "result":
      showAnswers(false);
      showResults(true);
      renderResult();
      break;
    default:
      showResults(false);
      showAnswers(false);
      showQuestion(false);
      renderDemo();
      break;
  }
}

const mapPlayerToHtmlImg = (p, i) => {
  const roation = gameCycle ? i % 2 == 0 ? 45 : -45 : i % 2 == 0 ? -45 : 45;
  return `<div class="player">
      <img style="transform: rotate(${roation}deg);" src="${"/img/laureates/" + p.laureate.imagePath}" alt="${p.laureate.firstname}">
    </div>`;
}

function filterAnswer(_correct) {
  return (p) => p.inAnswer == _correct;
}

function renderResult() {
  if (gameState.question == undefined) return;
  const question = document.querySelector(".result .q");
  const answer = document.querySelector(".result .a");
  question.innerHTML = gameState.question.text;
  answer.innerHTML = gameState.question.answers.find((a => a.isCorrect == true)).text;

  const correctPlayers = gameState.players
    .filter(filterAnswer(true))
    .map(mapPlayerToHtmlImg)
    .join(" ");
  const wrongPlayers = gameState.players
    .filter(filterAnswer(false))
    .map(mapPlayerToHtmlImg)
    .join(" ");

  const correctGroup = document.querySelector(".correct");
  const wrongGroup = document.querySelector(".wrong");

  correctGroup.innerHTML = correctPlayers;
  wrongGroup.innerHTML = wrongPlayers;
}


function renderDemo() {

}

function renderGame() {
  drawAnswers(gameState.question);
  drawPlayersShadow(gameState.players);
  drawPreviousPosition(gameState.players);
  drawPlayers(gameState.players);
  drawDialogue(gameState.players);
}

function start(s) {
  setup = s;
  //canvas initial setup
  canvas.width = setup.unitSize * setup.width;
  canvas.height = setup.unitSize * setup.height;
  document.querySelector(
    ".board"
  ).style = `width: ${canvas.width}px;height:${canvas.height}px;`;

  showAnswers(false);
  showResults(false);
  showQuestion(false);
  showDemo(false);
}
