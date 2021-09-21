import * as mongoose from "mongoose";
const { Schema } = mongoose;

const QuestionSchema = new Schema({
  text: String,
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  },
  answers: [
    {
      color: String,
      text: String,
      isCorrect: Boolean,
      position: {
        x: Number,
        y: Number,
        width: Number,
        height: Number,
      },
    },
  ],
});

export default QuestionSchema;
