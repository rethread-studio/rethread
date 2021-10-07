import * as mongoose from "mongoose";
const { Schema } = mongoose;

const QuestionSchema = new Schema({
  text: String,
  answers: [
    {
      text: String,
      isCorrect: Boolean,
    },
  ],
});

export default QuestionSchema;
