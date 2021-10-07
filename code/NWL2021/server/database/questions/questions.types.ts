import * as mongoose from "mongoose";
import { BoxPosition } from "../../types";

export interface IAnswer {
  color: string;
  text: string;
  isCorrect: boolean;
  position: BoxPosition;
}

export interface IQuestion {
  text: string;
  position: BoxPosition;
  answers: IAnswer[];
}

export interface IQuestionDocument extends IQuestion, mongoose.Document {}
export interface IQuestionModel extends mongoose.Model<IQuestionDocument> {}
