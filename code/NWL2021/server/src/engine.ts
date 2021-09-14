export interface Player extends Position {
  inQuestion: boolean;
  laureate: any;
  socket: any | null;
}

interface Position {
  x: number;
  y: number;
}
interface BoxPosition extends Position {
  width: number;
  height: number;
}
export interface Answer {
  color: string;
  text: string;
  isCorrect: boolean;
  position: BoxPosition;
}
export interface Question {
  text: string;
  position: BoxPosition;
  answers: Answer[];
}
export const questions: Question[] = [
  {
    text: "Did Alan Turing win a nobel?",
    position: { x: 3, width: 5, y: 3, height: 0 },
    answers: [
      {
        text: "Yes",
        position: {
          x: 0,
          y: 4,
          width: 3,
          height: 1,
        },
        isCorrect: true,
        color: "green",
      },
      {
        text: "No",
        position: {
          x: 10,
          y: 0,
          width: 1,
          height: 2,
        },
        isCorrect: false,
        color: "red",
      },
    ],
  },
  {
    text: "How many nobel prices have been given?",
    position: { x: 3, width: 5, y: 2, height: 1 },
    answers: [
      {
        text: "100",
        position: {
          x: 4,
          y: 4,
          width: 3,
          height: 1,
        },
        isCorrect: false,
        color: "green",
      },
      {
        text: "200",
        position: {
          x: 4,
          y: 0,
          width: 3,
          height: 1,
        },
        isCorrect: true,
        color: "red",
      },
    ],
  },
];

export const state: { players: { [key: string]: Player }; question: Question } =
  {
    players: {},
    question: questions[1],
  };

export const walls: BoxPosition[] = [];

export const gameSize = {
  width: 12,
  height: 6,
};
export const boxSize = 100;

export function checkCollision(player: Player, obj: Position) {
  if ((obj as any).width !== undefined) {
    const position: BoxPosition = obj as BoxPosition;
    return (
      player.x >= position.x &&
      player.x <= position.x + position.width &&
      player.y >= position.y &&
      player.y <= position.y + position.height
    );
  }
  return player.x == obj.x && player.y == obj.y;
}

export function newPlayer(id: string, laureate) {
  // get open position
  const player: Player = {
    x: 0,
    y: 0,
    laureate,
    inQuestion: false,
    socket: null,
  };
  while (!isValidPosition(player, id)) {
    player.x = Math.floor(Math.random() * Number(gameSize.width));
    player.y = Math.floor(Math.random() * Number(gameSize.height));
  }

  // add player to engine.players obj
  state.players[id] = player;
  return player;
}
export function isValidPosition(position: Position, playerId: string) {
  // bounds check
  if (position.x < 0 || position.x >= gameSize.width) {
    return false;
  }
  if (position.y < 0 || position.y >= gameSize.height) {
    return false;
  }

  if (
    position.y >= state.question.position.y &&
    position.y <= state.question.position.y + state.question.position.height
  ) {
    if (
      position.x >= state.question.position.x &&
      position.x <= state.question.position.x + state.question.position.width
    ) {
      return false;
    }
  }

  for (const wall of walls) {
    if (position.y >= wall.y && position.y <= wall.y + wall.height) {
      if (position.x >= wall.x && position.x <= wall.x + wall.width) {
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
    const player = state.players[key];
    // if the state.players overlap. hope this works
    if (checkCollision(player, position)) {
      hasCollided = true;
      return; // don't bother checking other stuff
    }
  });
  if (hasCollided) {
    return false;
  }

  return true;
}

export function movePlayer(id: string, position: Position) {
  var player = state.players[id];
  var newPosition = {
    x: player.x + position.x,
    y: player.y + position.y,
  };
  if (isValidPosition(newPosition, id)) {
    // move the player and increment score
    player.x = newPosition.x;
    player.y = newPosition.y;

    let inQuestion: boolean = false;
    for (const answer of state.question.answers) {
      if (checkCollision(player, answer.position)) {
        inQuestion = true;
        break;
      }
    }
    player.inQuestion = inQuestion;
  }
}
