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
  renderWinners(winners || []);
}

async function renderWinners(players) {

  const width = game.setup.unitSize;
  const height = game.setup.unitSize;

  const scale = 1;

  const gameW = game.setup.unitSize * game.setup.width;
  const gameH = game.setup.unitSize * game.setup.height;


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