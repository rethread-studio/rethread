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

function renderResults() {
  const question = document.querySelector(".result .q");
  question.innerHTML = game.question.text;

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

  const correctGroup = document.querySelector(".correct");
  const wrongGroup = document.querySelector(".wrong");

  correctGroup.innerHTML = correctPlayers.map(mapPlayerToHtmlImg).join(" ");
  wrongGroup.innerHTML = wrongPlayers.map(mapPlayerToHtmlImg).join(" ");
}
