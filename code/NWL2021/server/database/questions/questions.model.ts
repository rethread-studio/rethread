import * as mongoose from "mongoose";
const { model } = mongoose;

import { IQuestionDocument, IQuestionModel } from "./questions.types";
import QuestionSchema from "./questions.schema";

const QuestionModel = model<IQuestionDocument>(
  "Question",
  QuestionSchema
) as IQuestionModel;

export default QuestionModel;
