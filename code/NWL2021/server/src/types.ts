export interface Player extends Position {
  inQuestion: boolean;
  laureate: any;
  socket: any | null;
  // previousPositions: any;
  previousPositions: Position[];
}

export interface Position {
  x: number;
  y: number;
}
export interface BoxPosition extends Position {
  width: number;
  height: number;
}