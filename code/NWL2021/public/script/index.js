function start() {
  console.log("start");
  var socket = io("/");
  var canvas = document.getElementById("game");
  canvas.width = boxSize * gameSize.x;
  canvas.height = boxSize * gameSize.y;
  var ctx = canvas.getContext("2d");
  // var players = {}; // this is magically defined in game.js

  var localDirection; // used to display accel direction

  socket.on("gameStateUpdate", updateGameState);

  function drawPlayers(players) {
    // draw players
    Object.keys(players).forEach((playerId) => {
      let player = players[playerId];

      ctx.fillStyle = player.inQuestion ? "blue" : player.colour;
      ctx.fillRect(player.x * boxSize, player.y * boxSize, boxSize, boxSize);

      if (playerId == socket.id) {
        direction = localDirection;
      } else {
        direction = player.direction;
      }
    });
  }

  function drawQuestion(question) {
    const questionE = document.querySelector(".question");
    questionE.innerHTML = question.text;
    questionE.style = `top: ${question.position.y1 * boxSize}px;left: ${
      question.position.x1 * boxSize
    }px; width: ${
      (question.position.x2 - question.position.x1 + 1) * boxSize
    }px; height: ${
      (question.position.y2 - question.position.y1 + 1) * boxSize
    }px`;

    // draw Question
    for (let i = 0; i < question.answers.length; i++) {
      const answer = question.answers[i];
      const answerE = document.querySelector(".answer" + (i + 1));
      answerE.innerHTML = answer.text;

      answerE.style = `top: ${answer.position.y1 * boxSize}px;left: ${
        answer.position.x1 * boxSize
      }px; width: ${
        (answer.position.x2 - answer.position.x1 + 1) * boxSize
      }px; height: ${
        (answer.position.y2 - answer.position.y1 + 1) * boxSize
      }px`;

      ctx.fillStyle = answer.color;
      ctx.fillRect(
        answer.position.x1 * boxSize,
        answer.position.y1 * boxSize,
        (answer.position.x2 - answer.position.x1 + 1) * boxSize,
        (answer.position.y2 - answer.position.y1 + 1) * boxSize
      );
    }
  }

  function updateGameState(gameState) {
    // update local state to match state on server
    state.players = gameState.players;
    if (gameState.question) state.question = gameState.question;
    // draw stuff
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawPlayers(state.players);
  }

  // key handling
  document.addEventListener(
    "keydown",
    function (e) {
      if (e.key == "ArrowDown") {
        socket.emit("down");
        movePlayer(socket.id, 0, 1);
        localDirection = "down";
      } else if (e.key == "ArrowUp") {
        socket.emit("up");
        movePlayer(socket.id, 0, -1);
        localDirection = "up";
      } else if (e.key == "ArrowLeft") {
        socket.emit("left");
        movePlayer(socket.id, -1, 0);
        localDirection = "left";
      } else if (e.key == "ArrowRight") {
        socket.emit("right");
        movePlayer(socket.id, 1, 0);
        localDirection = "right";
      }
    },
    false
  );

  function gameLoop() {
    // update game
    updateGameState({ players: state.players });
  }

  function drawGame() {
    // draw stuff
    drawQuestion(state.question);
    drawPlayers(state.players);
    requestAnimationFrame(drawGame);
  }

  setInterval(gameLoop, 25);
  requestAnimationFrame(drawGame);
}

start();
