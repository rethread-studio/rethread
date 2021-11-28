

function getPlayersResult() {
  const correctPlayers = [];
  const players = game.players.filter((p) => p.inAnswer);
  const answerIndex = game.question.answers.findIndex((a) => a.isCorrect);
  const answer = game.question.answers[answerIndex];
  const position = game.gameState.answerPositions[answerIndex]
  const answerElement = document.querySelector(".result .a");
  if (answerElement.innerHTML != answer.text) answerElement.innerHTML = answer.text;
  for (const p of players) {
    if (
      p.x >= position.x &&
      p.x <= position.x + position.width &&
      p.y >= position.y &&
      p.y <= position.y + position.height
    ) {
      correctPlayers.push(p);
    }
  }
  return {
    winners: correctPlayers,
  }
}

const total_steps = 4;
let demoStep = 0;
let winners = [];
function openResults() {
  const question = document.querySelector(".result .q");
  if (question.innerHTML != game.question.text)
    question.innerHTML = game.question.text;
  const results = getPlayersResult();
  winners = results.winners;
}

setInterval(() => {
  demoStep = (demoStep + 1) % total_steps;
}, 250);

function renderResults() {
  if (winners.length > 0) {
    renderWinners(winners || []);
    renderWinDecoration();
  } else {
    renderLooseDecoration();
  }
}

function renderLooseDecoration() {
  if (game.setup == undefined) return;
  //get mid point
  const ctxW = game.setup.unitSize * config.renderScale * game.setup.width;
  const ctxH = game.setup.unitSize * config.renderScale * game.setup.height;
  const guideLine = Math.max(ctxW, ctxH);
  const unitSize = 60;
  let lineStep = 0;
  for (let i = unitSize; i < guideLine; i += unitSize) {
    if (lineStep <= demoStep) {
      ctx.lineCap = "round";
      ctx.strokeStyle = lineStep == (total_steps - 1) ? "#00DBFF" : "white";
      ctx.lineWidth = !game.gameCycle ? config.resultLineSize.small + lineStep * 4 : config.resultLineSize.big + lineStep * 2;
      ctx.beginPath();
      ctx.moveTo(ctxW / 2 - i, 10);
      ctx.lineTo(ctxW / 2, i);
      ctx.lineTo(ctxW / 2 + i, 10);
      ctx.stroke();
    }
    lineStep = (lineStep + 1) % total_steps;
  }
  resetCtxSeetings();
  renderFaces(ctxW, ctxH);
}

function renderFaces(_x, _y) {
  ctx.lineCap = "round";
  const padding = 200 * config.renderScale;
  const faceSize = 250;
  drawSadFace(_x - padding, _y - padding, faceSize, false);
  drawSadFace(padding, _y - padding, faceSize, true);
  resetCtxSeetings();
}

function drawSadFace(_x, _y, _size, _mirror = true) {
  const angle = !game.gameCycle ? 30 * Math.PI / 180 : -30 * Math.PI / 180;
  ctx.translate(_x, _y);
  ctx.rotate(_mirror ? angle : angle * -1);
  //background
  resetCtxSeetings();
  ctx.beginPath();
  ctx.globalAlpha = !game.gameCycle ? 0.7 : 0.9;
  ctx.fillStyle = "#1B222E";
  ctx.arc(0, 0, _size + 30, 0, 2 * Math.PI);
  ctx.fill();

  //face
  resetCtxSeetings();
  ctx.strokeStyle = "#00DBFF";
  ctx.lineWidth = !game.gameCycle ? 10 : 15;
  ctx.beginPath();
  ctx.arc(0, 0, _size, 0, 2 * Math.PI);
  ctx.stroke();

  //eyes
  const eyePadding = _size / 3;
  const eyeSize = _size / 10
  ctx.fillStyle = "#00DBFF";
  ctx.beginPath();
  ctx.arc(eyePadding, - eyePadding, eyeSize, 0, 2 * Math.PI);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(- eyePadding, - eyePadding, eyeSize, 0, 2 * Math.PI);
  ctx.fill();

  //mouth
  const mouthPadding = _size / 2;
  const mouthSize = _size / 4;
  ctx.lineCap = "round";
  ctx.scale(1, 0.9);
  ctx.beginPath();
  ctx.arc(0, mouthPadding, mouthSize, Math.PI, 0);
  ctx.stroke();
  //tears

  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function renderWinDecoration() {
  if (game.setup == undefined) return;
  //get mid point
  const ctxW = game.setup.unitSize * config.renderScale * game.setup.width;
  const ctxH = game.setup.unitSize * config.renderScale * game.setup.height;
  const guideLine = Math.max(ctxW, ctxH);
  const unitSize = 60;
  let lineStep = 0;
  for (let i = unitSize; i < guideLine; i += unitSize) {
    if (lineStep <= demoStep) {
      ctx.lineCap = "round";
      ctx.strokeStyle = lineStep == (total_steps - 1) ? "red" : "white";
      ctx.lineWidth = !game.gameCycle ? config.resultLineSize.small + lineStep * 4 : config.resultLineSize.big + lineStep * 2;
      ctx.beginPath();
      ctx.moveTo(ctxW / 2 - i, ctxH + 10);
      ctx.lineTo(ctxW / 2, ctxH - i);
      ctx.lineTo(ctxW / 2 + i, ctxH + 10);
      ctx.stroke();
    }
    lineStep = (lineStep + 1) % total_steps;
  }
  resetCtxSeetings();
  ctx.lineCap = "round";
  const padding = 150 * config.renderScale;
  drawStarGroup(ctxW - padding, ctxH - padding, 30);
  drawStarGroup(padding, ctxH - padding, 30);
  resetCtxSeetings();
}

function resetCtxSeetings() {
  ctx.setLineDash([]);
  ctx.lineCap = "square";
  ctx.globalAlpha = 1;
}

function drawStarGroup(_x, _y, size) {
  for (let i = total_steps - 1; i >= 0; i--) {
    const color = i <= demoStep ? "white" : "#1B222E";
    drawStar(_x, _y, 5, (size + (i * 30)) * config.renderScale, (size / 2 + (i * 15)) * config.renderScale, color);
  }
}

function drawStar(cx, cy, spikes, outerRadius, innerRadius, fillcolor) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius)
  for (i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y)
    rot += step

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y)
    rot += step
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fillStyle = fillcolor;
  ctx.fill();

}


async function renderWinners(players) {
  const width = game.setup.unitSize + game.setup.unitSize / 2;
  const height = width;
  const scale = 1;
  const gameW = game.setup.unitSize * game.setup.width;

  let groupW = players.length >= config.max_group ? width * config.max_group : width * players.length;
  let iniX = gameW / 2 - groupW / 2 + width / 2;
  let yPos = 1;
  const boardState = game.gameCycle ? 1 : -1;

  // draw players
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const laureate = await game.getLaureate(player.laureateID);
    player.laureate = laureate;
    const imagePath = `/img/laureates/${laureate.imagePath}`;

    //calculate the initial position in X
    if (i % config.max_group == 0 && i != 0) {
      groupW = players.length - i >= config.max_group ? width * config.max_group : width * (players.length - i);
      iniX = (gameW / 2) - (groupW / 2) + width / 2;
    }

    if (!imageCache[imagePath]) {
      imageCache[imagePath] = new Image(width, height);
      imageCache[imagePath].src = imagePath;
    }
    const side = i % 2 == 0 ? 1 : -1;
    const angle = (Math.PI / 4) * side * boardState;
    if (i % config.max_group == 0 && i != 0) yPos++;

    renderImage(
      imageCache[imagePath],
      iniX + width * (i % config.max_group),
      game.setup.unitSize * 2 + yPos * height,
      width,
      height,
      angle,
      scale
    );
  }
}