import * as mongoose from "mongoose";
const { Schema } = mongoose;

const StateSchema = new Schema({
  height: Number,
  width: Number,
  unitSize: Number,
  questionPosition: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  },
  answersPositions: [{
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  }],
  walls: [
    {
      x: Number,
      y: Number,
      width: Number,
      height: Number,
    },
  ],
});

export default StateSchema;
