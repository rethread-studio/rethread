export interface Player extends Position {
  inQuestion: boolean;
  laureate: any;
  socket: any | null;
  previousPositions: Position[];
  status: playerStatus,
}

export interface Position {
  x: number;
  y: number;
}
export interface BoxPosition extends Position {
  width: number;
  height: number;
}

type playerStatus = "left" | "up" | "down" | "right" | "hit" | "win" | "lose" | "iddle";