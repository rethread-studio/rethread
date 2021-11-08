import * as mongoose from "mongoose";
const { Schema } = mongoose;

const QuestionSchema = new Schema({
  text: String,
  type: String,
  answers: [
    {
      text: String,
      isCorrect: Boolean,
    },
  ],
});

export default QuestionSchema;
