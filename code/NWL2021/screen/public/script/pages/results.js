const mapPlayerToHtmlImg = (p, i) => {
  const rotation = game.gameCycle
    ? i % 2 == 0
      ? 45
      : -45
    : i % 2 == 0
      ? -45
      : 45;
  return `<div class="player">
      <img style="transform: rotate(${rotation}deg);" src="/img/laureates/${p.laureate?.imagePath}">
    </div>`;
};

function getPlayersResult() {
  const correctPlayers = [];
  const wrongPlayers = [];

  const players = game.players.filter((p) => p.inAnswer);

  for (let i = 0; i < game.question.answers.length; i++) {
    const position = game.setup.answersPositions[i];
    const answer = game.question.answers[i];
    if (!answer.isCorrect) continue;

    document.querySelector(".result .a").innerHTML = answer.text;

    for (const p of players) {
      if (
        p.x >= position.x &&
        p.x <= position.x + position.width &&
        p.y >= position.y &&
        p.y <= position.y + position.height
      ) {
        correctPlayers.push(p);
      } else {
        wrongPlayers.push(p);
      }
    }
  }
  return {
    winners: correctPlayers,
    loosers: wrongPlayers,
  }
}

function renderResults() {
  const question = document.querySelector(".result .q");
  question.innerHTML = game.question.text;
  const { winners } = getPlayersResult();
  const fireWorks = winners.length > 0 ? winners.map(w => {
    console.log(w)
    return createFirework(w.x, w.y)
  }) : [];
  renderFireWorks(fireWorks);
  renderWinners(winners || []);
  //if here are winners render fireworks 
  //if not then render no winners sign or sad face
}

const totalStep = 4;
const fireWorkAngles1 = [45, 135, 225, 315];
const fireWorkAngles2 = [0, 90, 180, 270];
const fireWorkLenght = { init: 0.1, end: 0.5 };

function createFirework(_x, _y) {
  const rand = Math.floor(Math.random() * 2);
  return {
    step: Math.floor(Math.random() * totalStep),
    position: {
      x: _x,
      y: _y,
    },
    angles: rand == 0 ? fireWorkAngles1 : fireWorkAngles2,
  }
}

function drawFireWorkCenter(_position, _fill) {
  ctx.fillStyle = "white";
  ctx.lineWidth = "2";
  ctx.strokeStyle = "white";
  ctx.beginPath();
  ctx.arc(
    _position.x * game.setup.unitSize,
    _position.y * game.setup.unitSize,
    8,
    0,
    2 * Math.PI
  );
  _fill ? ctx.fill() : ctx.stroke();
}

function drawFireWorkLegs(position, angles) {

  // const angles = 
  for (const angle of angles) {
    const initX = position.x * game.setup.unitSize + Math.sin(angle * Math.PI / 180) * (fireWorkLenght.init * game.setup.unitSize);
    const initY = position.y * game.setup.unitSize + Math.cos(angle * Math.PI / 180) * (fireWorkLenght.init * game.setup.unitSize);
    const endX = position.x * game.setup.unitSize + Math.sin(angle * Math.PI / 180) * (fireWorkLenght.end * game.setup.unitSize);
    const endY = position.y * game.setup.unitSize + Math.cos(angle * Math.PI / 180) * (fireWorkLenght.end * game.setup.unitSize);

    ctx.beginPath();
    ctx.lineWidth = "2";
    ctx.strokeStyle = "white";
    ctx.moveTo(
      initX,
      initY
    );
    ctx.lineTo(
      endX,
      endY
    );
    ctx.stroke();
  }
}

function fireWorkSparkles(position, rad, _fill, angles) {

  for (const angle of angles) {
    const endX = position.x * game.setup.unitSize + Math.sin(angle * Math.PI / 180) * (fireWorkLenght.end * game.setup.unitSize);
    const endY = position.y * game.setup.unitSize + Math.cos(angle * Math.PI / 180) * (fireWorkLenght.end * game.setup.unitSize);

    ctx.fillStyle = "white";
    ctx.lineWidth = "2";
    ctx.strokeStyle = "white";

    ctx.beginPath();
    ctx.arc(
      endX,
      endY,
      rad,
      0,
      2 * Math.PI
    );
    _fill ? ctx.fill() : ctx.stroke();
  }

}

function renderFireWorks(fireWorks) {
  for (const firework of fireWorks) {
    switch (firework.step) {
      case 0:
        drawFireWorkCenter(firework.position, true);
        break;
      case 1:
        drawFireWorkCenter(firework.position, false);
        drawFireWorkLegs(firework.position, firework.angles);
        break;
      case 2:
        drawFireWorkLegs(firework.position, firework.angles);
        fireWorkSparkles(firework.position, 4, true, firework.angles);
        break;
      case 3:
        fireWorkSparkles(firework.position, 6, false, firework.angles);
        //get a random pos now
        break;
      default:
        drawFireWorkCenter(firework.position, true);
        break;
    }
    firework.step = (firework.step + 1) % totalStep;
  }
}

async function renderWinners(players) {

  const width = game.setup.unitSize;
  const height = game.setup.unitSize;
  const scale = 1;
  const gameW = game.setup.unitSize * game.setup.width;

  let groupW = players.length >= config.max_group ? game.setup.unitSize * config.max_group : game.setup.unitSize * players.length;
  let iniX = gameW / 2 - groupW / 2;
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
      groupW = players.length - i >= config.max_group ? game.setup.unitSize * config.max_group : game.setup.unitSize * (players.length - i);
      iniX = gameW / 2 - groupW / 2;
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
      iniX + game.setup.unitSize * (i % config.max_group),
      game.setup.unitSize * 2 + yPos * game.setup.unitSize,
      width,
      height,
      angle,
      scale
    );
  }
}