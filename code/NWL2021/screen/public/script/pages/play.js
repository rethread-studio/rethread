async function drawPlayersShadow(players) {
  const width = game.setup.unitSize;
  const height = game.setup.unitSize;

  const boardState = game.gameCycle ? 1 : -1;
  ctx.save();
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
      ctx.globalCompositeOperation = 'lighter';
      renderImage(imageCache[imagePath], x, y, width, height, angle, 0.8);
    }
  }
  ctx.restore();
}

async function drawPreviousPosition(players) {
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
    ctx.strokeStyle = "#121826";
    ctx.moveTo(
      positions[0].x * config.renderScale * game.setup.unitSize +
      (game.setup.unitSize * config.renderScale) / 2,
      positions[0].y * config.renderScale * game.setup.unitSize +
      (game.setup.unitSize * config.renderScale) / 2
    );
    for (let i = 1; i < positions.length; i++) {
      ctx.lineTo(
        positions[i].x * config.renderScale * game.setup.unitSize +
        (game.setup.unitSize * config.renderScale) / 2,
        positions[i].y * config.renderScale * game.setup.unitSize +
        (game.setup.unitSize * config.renderScale) / 2
      );
    }
    ctx.lineTo(
      player.x * config.renderScale * game.setup.unitSize +
      (game.setup.unitSize * config.renderScale) / 2,
      player.y * config.renderScale * game.setup.unitSize +
      (game.setup.unitSize * config.renderScale) / 2
    );
    ctx.stroke();
  }
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
    player.x * config.renderScale * game.setup.unitSize +
    (game.setup.unitSize * config.renderScale) / 2;
  const y =
    player.y * config.renderScale * game.setup.unitSize +
    (game.setup.unitSize * config.renderScale) / 2;


  ctx.translate(x, y);
  ctx.rotate(angle);
  //background
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(0, 0, config.renderScale * game.setup.unitSize / 2, 0, 2 * Math.PI
  );
  ctx.fill();
  //emoji
  ctx.font = `${!game.gameCycle ? "12.5rem" : "9.375rem"} serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 0, 0);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}


function renderQuestion(question) {
  const size = config.question.linseSize;

  const questionPosition = game.setup.questionPosition;
  const unitSize = game.setup.unitSize * config.renderScale;

  for (let i = 0; i < questionPosition.width + 1; i++) {
    for (let j = 0; j < questionPosition.height + 1; j++) {
      const sizeMod = game.setup.unitSize / 2 + Math.abs(Math.sin((i + (j * 100) + playConfig.questionAnimation) * playConfig.questionSpeed) * game.setup.unitSize);

      ctx.beginPath();
      ctx.strokeStyle = "white";
      ctx.lineWidth = config.question.lineWidth;
      if (i % 2 == 0) {
        const x = questionPosition.x * unitSize + unitSize * i + unitSize / 2;
        ctx.moveTo(
          x,
          questionPosition.y * unitSize + unitSize * j + sizeMod
        );
        ctx.lineTo(
          x,
          questionPosition.y * unitSize +
          unitSize * j +
          unitSize
        );
      } else {
        ctx.moveTo(
          questionPosition.x * unitSize + unitSize * i + unitSize / size + sizeMod,
          questionPosition.y * unitSize + unitSize * j + unitSize / 2
        );
        ctx.lineTo(
          questionPosition.x * unitSize +
          unitSize * i +
          unitSize -
          unitSize / size - sizeMod,
          questionPosition.y * unitSize + unitSize * j + unitSize / 2
        );
      }

      ctx.stroke();
    }
  }
  playConfig.questionAnimation++;
}

function renderAnswer(question) {

  for (let k = 0; k < question.answers.length; k++) {
    const position = game.gameState.answerPositions[k];

    const unitSize = game.setup.unitSize * config.renderScale;
    //draw the mid point
    for (let i = 0; i < position.width + 1; i++) {
      for (let j = 0; j < position.height + 1; j++) {
        ctx.fillStyle = "#c4ffff";
        ctx.beginPath();

        const size = config.dotSize.small / 2 + Math.abs(Math.sin((i + (j * 100) + playConfig.answerAnimation) * playConfig.answerSpeed) * config.dotSize.big);
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

  playConfig.answerAnimation++;
}

function updateQuestion(question) {
  if (!question || !game.setup) return;
  const questionE = document.querySelector(".question");
  questionE.innerHTML = question.text;

  game.endDate;

  updatePositionElement(questionE, game.setup.questionPosition);
  questionE.style.fontSize =
    question.text.length < 10 ? config.questionSize.big : config.questionSize.small;

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
  step: 0,
  answerAnimation: 0,
  questionAnimation: 0,
  answerSpeed: 0.03,
  questionSpeed: 0.03
}

async function renderGame() {
  renderAnswer(game.question);
  renderQuestion(game.question);

  // await drawPreviousPosition(game.players || []);
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
    playConfig.answerSpeed = 0.09;
  } else if (time <= 20) {
    element.classList.add("text-neon-yellow");
    playConfig.answerSpeed = 0.03;

  } else {
    element.classList.add("text-neon-green");
    playConfig.answerSpeed = 0.02;
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
