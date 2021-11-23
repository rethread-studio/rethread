import * as mongoose from "mongoose";
import { BoxPosition } from "../../types";

export interface IState {
  width: number;
  height: number;
  unitSize: number;
  questionPosition: BoxPosition;
  answersPositions: [BoxPosition[]];
  walls: BoxPosition[];
}

export interface IStateDocument extends IState, mongoose.Document {}
export interface IStateModel extends mongoose.Model<IStateDocument> {}
