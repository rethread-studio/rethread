import mongoose from "mongoose";
const { Schema } = mongoose;

const EmojiSchema = new Schema({
  _id: mongoose.Types.ObjectId,
  emoji: String,
  used: { type: Number, default: 0 },
});

export default EmojiSchema;
