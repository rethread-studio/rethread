var socket = io("/screen");
socket.on("setup", (data) => {
  socket.off("gameStateUpdate");
  start(data);
});

const imgs = {};
const shadows = {};
let gameCycle = true;

function start(setup) {
  //canvas initial setup
  const canvas = document.getElementById("game");
  canvas.width = setup.unitSize * setup.width;
  canvas.height = setup.unitSize * setup.height;
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

    // draw players
    Object.keys(players).forEach((playerId) => {
      let player = players[playerId];
      if (imgs[player.laureate.dialogue] && player.inQuestion) {
        renderImage(
          player.x * setup.unitSize + setup.unitSize / 2,
          player.y * setup.unitSize + setup.unitSize / 2,
          setup.unitSize,
          setup.unitSize,
          0,
          gameCycle ? 1 : 0.8,
          imgs[player.laureate.dialogue]
        );
      } else {
        imgs[player.laureate.dialogue] = new Image(
          setup.unitSize,
          setup.unitSize
        );
        // Load an image of intrinsic size 300x227 in CSS pixels
        imgs[player.laureate.dialogue].src = player.laureate.dialogue;
        imgs[player.laureate.dialogue].onload = function () {
          if (player.inQuestion) {
            renderImage(
              player.x * setup.unitSize + setup.unitSize / 2,
              player.y * setup.unitSize + setup.unitSize / 2,
              setup.unitSize,
              setup.unitSize,
              0,
              gameCycle ? 1 : 0.8,
              imgs[player.laureate.dialogue]
            );
          }
        };
      }
    });
  }

  function drawPlayers(players) {
    if (!players) return;
    // draw players
    Object.keys(players).forEach((playerId) => {
      let player = players[playerId];
      if (imgs[player.laureate.img]) {
        const angle = getAngle(player.status);
        renderImage(
          player.x * setup.unitSize + setup.unitSize / 2,
          player.y * setup.unitSize + setup.unitSize / 2,
          setup.unitSize,
          setup.unitSize,
          angle,
          gameCycle ? 0.8 : 1,
          imgs[player.laureate.img]
        );
      } else {
        imgs[player.laureate.img] = new Image(setup.unitSize, setup.unitSize);
        // Load an image of intrinsic size 300x227 in CSS pixels
        imgs[player.laureate.img].src = `/img/laureates/${player.laureate.img}`;
        imgs[player.laureate.img].onload = function () {
          renderImage(
            player.x * setup.unitSize + setup.unitSize / 2,
            player.y * setup.unitSize + setup.unitSize / 2,
            setup.unitSize,
            setup.unitSize,
            0,
            gameCycle ? 0.8 : 1,
            imgs[player.laureate.img]
          );
          // ctx.drawImage(
          //   imgs[player.laureate.img],
          //   player.x * setup.unitSize,
          //   player.y * setup.unitSize,
          //   setup.unitSize,
          //   setup.unitSize
          // );
        };
      }
    });
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
    const boardState = gameCycle ? 1 : -1;
    if (!players) return;
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
        shadows[player.laureate.shadowImg].src = player.laureate.shadowImg;
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
    // draw players
    Object.keys(players).forEach((playerId) => {
      let player = players[playerId];
      let positions = player.previousPositions;
      if (positions.length == 0) return;

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
    questionE.style = `top: ${
      setup.questionPosition.y * setup.unitSize
    }px;left: ${setup.questionPosition.x * setup.unitSize}px; width: ${
      (setup.questionPosition.width + 1) * setup.unitSize
    }px; height: ${(setup.questionPosition.height + 1) * setup.unitSize}px`;
    //DRAW DECORATION
    ctx.beginPath();
    ctx.lineWidth = gameCycle ? "4" : "1";
    ctx.strokeStyle = "white";
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.rect(
      setup.questionPosition.x * setup.unitSize,
      setup.questionPosition.y * setup.unitSize,
      (setup.questionPosition.width + 1) * setup.unitSize,
      (setup.questionPosition.height + 1) * setup.unitSize
    );
    ctx.fill();
    ctx.stroke();

    // draw ANSWERS
    for (let i = 0; i < question.answers.length; i++) {
      const answer = question.answers[i];
      const position = setup.answersPositions[i];

      const answerE = document.querySelector(".answer" + (i + 1));
      answerE.innerHTML = answer.text;

      answerE.style = `top: ${position.y * setup.unitSize}px;left: ${
        position.x * setup.unitSize
      }px; width: ${(position.width + 1) * setup.unitSize}px; height: ${
        (position.height + 1) * setup.unitSize
      }px`;

      // if (gameCycle) {
      //   if (i % 2 == 0) {
      //     answerE.classList.remove("text-neon")
      //   } else {
      //     answerE.classList.add("text-neon")
      //   }
      //   //add new
      // } else {
      //   if (i % 2 == 0) {
      //     answerE.classList.add("text-neon")
      //   } else {
      //     answerE.classList.remove("text-neon")
      //   }
      // }
      //draw the mid point
      for (let i = 0; i < position.width + 1; i++) {
        for (let j = 0; j < position.height + 1; j++) {
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.arc(
            position.x * setup.unitSize +
              setup.unitSize * i +
              setup.unitSize / 2,
            position.y * setup.unitSize +
              setup.unitSize * j +
              setup.unitSize / 2,
            gameCycle ? "2" : "4",
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      }
    }
  }

  function getCBoardClass() {
    return gameCycle ? "chess1" : "chess2";
  }

  function drawBoard() {
    const game = document.getElementById("game");
    game.classList.remove(getCBoardClass());
    //add new
    gameCycle = !gameCycle;
    game.classList.add(getCBoardClass());
  }

  function updateGameState(gameState) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBoard();
    drawQuestion(gameState.question);
    drawPlayersShadow(gameState.players);
    drawPreviousPosition(gameState.players);
    drawPlayers(gameState.players);
    drawDialogue(gameState.players);
  }
}
