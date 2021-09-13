const questions = [
  {
    text: "Did Alan Turing win a nobel?",
    position: { x1: 3, x2: 8, y1: 3, y2: 3 },
    answers: [
      {
        text: "Yes",
        position: {
          x1: 0,
          x2: 3,
          y1: 4,
          y2: 5,
        },
        color: "green",
      },
      {
        text: "No",
        position: {
          x1: 10,
          x2: 11,
          y1: 0,
          y2: 2,
        },
        color: "red",
      },
    ],
  },
  {
    text: "How many nobel price have been awarded?",
    position: { x1: 3, x2: 8, y1: 2, y2: 3 },
    answers: [
      {
        text: "100",
        position: {
          x1: 4,
          x2: 7,
          y1: 4,
          y2: 5,
        },
        color: "green",
      },
      {
        text: "200",
        position: {
          x1: 4,
          x2: 7,
          y1: 0,
          y2: 1,
        },
        color: "red",
      },
    ],
  },
];

const state = {
  players: {},
  question: questions[1],
};

const walls = [];

const gameSize = {
  x: 12,
  y: 6,
};
const boxSize = 100;

function checkCollision(player, obj) {
  if (obj.x1 !== undefined) {
    return (
      player.x >= obj.x1 &&
      player.x <= obj.x2 &&
      player.y >= obj.y1 &&
      player.y <= obj.y2
    );
  }
  return player.x == obj.x && player.y == obj.y;
}

function isValidPosition(newPosition, playerId) {
  // bounds check
  if (newPosition.x < 0 || newPosition.x >= gameSize.x) {
    return false;
  }
  if (newPosition.y < 0 || newPosition.y >= gameSize.y) {
    return false;
  }

  if (
    newPosition.y >= state.question.position.y1 &&
    newPosition.y <= state.question.position.y2
  ) {
    if (
      newPosition.x >= state.question.position.x1 &&
      newPosition.x <= state.question.position.x2
    ) {
      return false;
    }
  }

  for (const wall of walls) {
    if (newPosition.y >= wall.y1 && newPosition.y <= wall.y2) {
      if (newPosition.x >= wall.x1 && newPosition.x <= wall.x2) {
        return false;
      }
    }
  }

  // collision check
  var hasCollided = false;

  Object.keys(state.players).forEach((key) => {
    if (key == playerId) {
      return;
    } // ignore current player in collision check
    player = state.players[key];
    // if the state.players overlap. hope this works
    if (checkCollision(player, newPosition)) {
      hasCollided = true;
      return; // don't bother checking other stuff
    }
  });
  if (hasCollided) {
    return false;
  }

  return true;
}

function movePlayer(id, x, y) {
  var player = state.players[id];

  var newPosition = {
    x: player.x + x,
    y: player.y + y,
  };
  if (isValidPosition(newPosition, id)) {
    // move the player and increment score
    player.x = newPosition.x;
    player.y = newPosition.y;

    let inQuestion = false;
    for (const answer of state.question.answers) {
      if (checkCollision(player, answer.position)) {
        inQuestion = answer;
        break;
      }
    }
    player.inQuestion = inQuestion;
  }
}

// thanks SO
function stringToColour(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = "#";
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xff;
    colour += ("00" + value.toString(16)).substr(-2);
  }
  return colour;
}

if (!this.navigator) {
  // super hacky thing to determine whether this is a node module or inlined via script tag
  module.exports = {
    state,
    stringToColour: stringToColour,
    movePlayer: movePlayer,
    boxSize: boxSize,
    gameSize: gameSize,
    isValidPosition: isValidPosition,
    questions,
    walls,
  };
}
