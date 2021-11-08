import * as mongoose from "mongoose";

export interface IAnswer {
  text: string;
  isCorrect: boolean;
}

export interface IQuestion {
  text: string;
  answers: IAnswer[];
  type: string;
}

export interface IQuestionDocument extends IQuestion, mongoose.Document {}
export interface IQuestionModel extends mongoose.Model<IQuestionDocument> {}
