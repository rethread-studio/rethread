async function drawPlayersShadow(players) {
  const width = game.setup.unitSize;
  const height = game.setup.unitSize;

  const boardState = game.gameCycle ? 1 : -1;

  // draw players
  for (const player of players) {
    if (!player.laureate) {
      const laureate = await game.getLaureate(player.laureateID);
      player.laureate = laureate;
    }
    const imagePath = `/img/laureates/${player.laureate.imagePath.split(".png")[0]
      }_shadow.png`;
    if (!imageCache[imagePath]) {
      imageCache[imagePath] = new Image(width, height);
      imageCache[imagePath].src = imagePath;
    }

    let positions = player.previousPositions;
    if (positions.length == 0) continue;
    for (let i = 0; i < positions.length; i++) {
      const x = positions[i].x * game.setup.unitSize + game.setup.unitSize / 2;
      const y = positions[i].y * game.setup.unitSize + game.setup.unitSize / 2;
      const side = i % 2 == 0 ? 1 : -1;
      const angle = (Math.PI / 4) * side * boardState;
      renderImage(imageCache[imagePath], x, y, width, height, angle, 0.8);
    }
  }
}

async function drawPreviousPosition(players) {
  ctx.shadowBlur = !game.gameCycle ? 5 : 10;
  for (const player of players) {
    if (!player.laureate) {
      const laureate = await game.getLaureate(player.laureateID);
      player.laureate = laureate;
    }
    ctx.shadowColor = player.laureate?.color || "white";
    let positions = player.previousPositions;
    if (positions.length == 0) return;

    //DRAW LINE PATH
    ctx.beginPath();
    ctx.lineWidth = game.gameCycle ? 2 : 4;
    ctx.strokeStyle = player.laureate?.color || "white";
    ctx.moveTo(
      positions[0].x * renderScale * game.setup.unitSize +
      (game.setup.unitSize * renderScale) / 2,
      positions[0].y * renderScale * game.setup.unitSize +
      (game.setup.unitSize * renderScale) / 2
    );
    for (let i = 1; i < positions.length; i++) {
      ctx.lineTo(
        positions[i].x * renderScale * game.setup.unitSize +
        (game.setup.unitSize * renderScale) / 2,
        positions[i].y * renderScale * game.setup.unitSize +
        (game.setup.unitSize * renderScale) / 2
      );
    }
    ctx.lineTo(
      player.x * renderScale * game.setup.unitSize +
      (game.setup.unitSize * renderScale) / 2,
      player.y * renderScale * game.setup.unitSize +
      (game.setup.unitSize * renderScale) / 2
    );
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

async function renderPlayers(players) {
  const width = game.setup.unitSize;
  const height = game.setup.unitSize;

  const scale = 1; // game.gameCycle ? 1 : 0.8;

  // draw players
  for (const player of players) {
    if (!player.laureate) {
      const laureate = await game.getLaureate(player.laureateID);
      player.laureate = laureate;
    }
    const imagePath = `/img/laureates/${player.laureate.imagePath}`;

    if (!imageCache[imagePath]) {
      imageCache[imagePath] = new Image(width, height);
      imageCache[imagePath].src = imagePath;
    }

    const angle = getAngle(player.status);
    renderImage(
      imageCache[imagePath],
      player.x * game.setup.unitSize + game.setup.unitSize / 2,
      player.y * game.setup.unitSize + game.setup.unitSize / 2,
      width,
      height,
      angle,
      scale
    );
    if (player.inAnswer) {
      renderDialogue(player);
    }
    drawEmoji(player);
  }
}

function renderDialogue(player) {
  if (player == null || !player.inAnswer) return;

  const width = game.setup.unitSize;
  const height = game.setup.unitSize;

  const scale = 1; // game.gameCycle ? 1 : 0.8;

  if (!imageCache[config.dialogueImagePath]) {
    imageCache[config.dialogueImagePath] = new Image(width, height);
    imageCache[config.dialogueImagePath].src = config.dialogueImagePath;
  }
  renderImage(
    imageCache[config.dialogueImagePath],
    player.x * game.setup.unitSize + game.setup.unitSize / 2,
    player.y * game.setup.unitSize + game.setup.unitSize / 2,
    width,
    height,
    0,
    scale
  );
}

function drawEmoji(player) {
  if (!game.emojis[player.socketID]) return;
  const emoji = game.emojis[player.socketID];
  const angle = getAngle(player.status);
  const x =
    player.x * renderScale * game.setup.unitSize +
    (game.setup.unitSize * renderScale) / 2;
  const y =
    player.y * renderScale * game.setup.unitSize +
    (game.setup.unitSize * renderScale) / 2;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.font = `${!game.gameCycle ? "70px" : "90px"} serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}


function renderQuestion(question) {
  const size = 2.5;

  const questionPosition = game.setup.questionPosition;
  const unitSize = game.setup.unitSize * renderScale;

  for (let i = 0; i < questionPosition.width + 1; i++) {
    for (let j = 0; j < questionPosition.height + 1; j++) {
      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.lineWidth = 4;
      if (i % 2 == 0) {
        if (game.gameCycle) {
          const x = questionPosition.x * unitSize + unitSize * i + unitSize / 2;
          ctx.moveTo(
            x,
            questionPosition.y * unitSize + unitSize * j + unitSize / size
          );
          ctx.lineTo(
            x,
            questionPosition.y * unitSize +
            unitSize * j +
            unitSize -
            unitSize / size
          );
        } else {
          ctx.moveTo(
            questionPosition.x * unitSize + unitSize * i + unitSize / size,
            questionPosition.y * unitSize + unitSize * j + unitSize / 2
          );
          ctx.lineTo(
            questionPosition.x * unitSize +
            unitSize * i +
            unitSize -
            unitSize / size,
            questionPosition.y * unitSize + unitSize * j + unitSize / 2
          );
        }
      } else {
        if (game.gameCycle) {
          ctx.moveTo(
            questionPosition.x * unitSize + unitSize * i + unitSize / size,
            questionPosition.y * unitSize + unitSize * j + unitSize / 2
          );
          ctx.lineTo(
            questionPosition.x * unitSize +
            unitSize * i +
            unitSize -
            unitSize / size,
            questionPosition.y * unitSize + unitSize * j + unitSize / 2
          );
        } else {
          ctx.moveTo(
            questionPosition.x * unitSize + unitSize * i + unitSize / 2,
            questionPosition.y * unitSize + unitSize * j + unitSize / size
          );
          ctx.lineTo(
            questionPosition.x * unitSize + unitSize * i + unitSize / 2,
            questionPosition.y * unitSize +
            unitSize * j +
            unitSize -
            unitSize / size
          );
        }
      }

      ctx.stroke();
    }
  }
}

function renderAnswer(question) {
  for (let k = 0; k < question.answers.length; k++) {
    const position = game.gameState.answerPositions[k];

    const size =
      k % 2 == 0
        ? game.gameCycle
          ? config.dotSize.small
          : config.dotSize.big
        : game.gameCycle
          ? config.dotSize.big
          : config.dotSize.small;

    const unitSize = game.setup.unitSize * renderScale;
    //draw the mid point
    for (let i = 0; i < position.width + 1; i++) {
      for (let j = 0; j < position.height + 1; j++) {
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
          position.x * unitSize + unitSize * i + unitSize / 2,
          position.y * unitSize + unitSize * j + unitSize / 2,
          size,
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }
  }
}

function updateQuestion(question) {
  if (!question || !game.setup) return;
  const questionE = document.querySelector(".question");
  questionE.innerHTML = question.text;

  game.endDate;

  updatePositionElement(questionE, game.setup.questionPosition);
  questionE.style.fontSize =
    question.text.length < 10 ? config.answerSize.big : config.answerSize.small;

  for (let i = 0; i < question.answers.length; i++) {
    const answer = question.answers[i];
    const position = game.gameState.answerPositions[i];

    const answerE = document.querySelector(".answer" + (i + 1));
    answerE.innerHTML = answer.text;

    updatePositionElement(answerE, position);
    answerE.style.fontSize =
      answer.text.length < 8 ? config.answerSize.big : config.answerSize.small;
  }
}

const playConfig = {
  total_steps: 4,
  step: 0
}

function renderQuestionDecoration() {
  playConfig.step = (playConfig.step + 1) % playConfig.total_steps;
  const ctxW = game.setup.unitSize * renderScale * game.setup.width;
  const ctxH = game.setup.unitSize * renderScale * game.setup.height;
  const nLines = 8;
  const lineDist = (ctxW / 5) / nLines;
  const stepPos = ctxW / playConfig.total_steps * playConfig.step;
  drawLineGroup(ctxW / 2, ctxW, ctxH, nLines, lineDist, stepPos, true);
  drawLineGroup(ctxW / 2, ctxW, ctxH, nLines, lineDist, stepPos, false);

}

function drawLineGroup(_x, _width, _height, _nLines, _lineDist, _stepPos, _mirror = true) {

  ctx.shadowBlur = !game.gameCycle ? 10 : 15;
  ctx.shadowColor = "white";
  ctx.globalAlpha = !game.gameCycle ? 0.5 : 0.7;
  ctx.setLineDash([5, 20]);
  ctx.lineCap = "round";
  ctx.strokeStyle = "white";
  ctx.lineWidth = !game.gameCycle ? 12 : 18;
  const dir = _mirror ? 1 : -1;
  for (let i = 0; i < _nLines; i++) {
    ctx.beginPath();
    const pos = (_stepPos + (i * _lineDist))
    ctx.moveTo(_x + pos * dir, 0);
    ctx.lineTo(_x + pos * dir, _height);
    ctx.stroke();
  }
  resetCtxSeetings();
}


async function renderGame() {
  renderAnswer(game.question);
  renderQuestion(game.question);

  await drawPreviousPosition(game.players || []);
  await drawPlayersShadow(game.players || []);
  await renderPlayers(game.players || []);
}

function cleanTimerClass() {
  const element = document.getElementsByClassName("timer")[0];
  element.classList.remove("text-neon-green");
  element.classList.remove("text-neon-yellow");
  element.classList.remove("text-neon-pink");
}

function setTimerClass(time) {
  const element = document.getElementsByClassName("timer")[0];
  if (time <= 10) {
    element.classList.add("text-neon-pink");
  } else if (time <= 20) {
    element.classList.add("text-neon-yellow");
  } else {
    element.classList.add("text-neon-green");
  }
}

setInterval(() => {
  if (!game.endDate) return;
  const time = new Date(game.endDate) - new Date().getTime();
  const newTime = Math.round(time / 1000).toString()
  const element = document.getElementsByClassName("timer")[0];
  if (element.style.display === "none") return;
  if (element.innerHTML == newTime) return;
  cleanTimerClass();
  setTimerClass(time / 1000);
  element.innerHTML = Math.round(time / 1000);
}, 250);
