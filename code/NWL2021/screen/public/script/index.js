var socket = io("/");
socket.on("setup", (data) => {
  socket.off("gameStateUpdate");
  start(data);
});
const imgs = {};
function start(setup) {
  const canvas = document.getElementById("game");
  canvas.width = setup.boxSize * setup.gameSize.width;
  canvas.height = setup.boxSize * setup.gameSize.height;
  const ctx = canvas.getContext("2d");

  socket.on("gameStateUpdate", updateGameState);

  socket.on("answer", ({ question, answer }) => {
    $scope.success = answer.isCorrect;
    const answerE = document.querySelector(".answer0");
    answerE.innerHTML = "Wining!!";
    $scope.$apply();
    setTimeout(() => {
      $scope.success = undefined;
      $scope.$apply();
    }, 3000);
  });

  function drawPlayers(players) {
    if (!players) return;
    // draw players
    Object.keys(players).forEach((playerId) => {
      let player = players[playerId];

      if (imgs[player.laureate.img]) {
        ctx.drawImage(
          imgs[player.laureate.img],
          player.x * setup.boxSize,
          player.y * setup.boxSize,
          setup.boxSize,
          setup.boxSize
        );
      } else {
        imgs[player.laureate.img] = new Image(setup.boxSize, setup.boxSize);
        // Load an image of intrinsic size 300x227 in CSS pixels
        imgs[player.laureate.img].src =
          "http://localhost:3500" + player.laureate.img;
        imgs[player.laureate.img].onload = function () {
          ctx.drawImage(
            imgs[player.laureate.img],
            player.x * setup.boxSize,
            player.y * setup.boxSize,
            setup.boxSize,
            setup.boxSize
          );
        };
      }

      // ctx.fillStyle = player.inQuestion ? "blue" : player.colour;
      // ctx.fillRect(
      //   player.x * setup.boxSize,
      //   player.y * setup.boxSize,
      //   setup.boxSize,
      //   setup.boxSize
      // );
    });
  }

  function drawQuestion(question) {
    if (!question) return;
    const questionE = document.querySelector(".question");
    questionE.innerHTML = question.text;
    questionE.style = `top: ${question.position.y * setup.boxSize}px;left: ${question.position.x * setup.boxSize
      }px; width: ${(question.position.width + 1) * setup.boxSize}px; height: ${(question.position.height + 1) * setup.boxSize
      }px`;

    // draw Question
    for (let i = 0; i < question.answers.length; i++) {
      const answer = question.answers[i];
      const answerE = document.querySelector(".answer" + (i + 1));
      answerE.innerHTML = answer.text;

      answerE.style = `top: ${answer.position.y * setup.boxSize}px;left: ${answer.position.x * setup.boxSize
        }px; width: ${(answer.position.width + 1) * setup.boxSize}px; height: ${(answer.position.height + 1) * setup.boxSize
        }px`;

      ctx.fillStyle = answer.color;
      ctx.fillRect(
        answer.position.x * setup.boxSize,
        answer.position.y * setup.boxSize,
        (answer.position.width + 1) * setup.boxSize,
        (answer.position.height + 1) * setup.boxSize
      );
    }
  }

  function updateGameState(gameState) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawQuestion(gameState.question);
    drawPlayers(gameState.players);
  }
}
