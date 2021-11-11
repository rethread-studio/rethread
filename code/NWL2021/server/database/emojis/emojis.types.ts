import * as mongoose from "mongoose";

export interface IEmoji {
  _id: string;
  used: number;
  emoji: string;
}

export interface IEmojiDocument extends Omit<IEmoji, "_id">, mongoose.Document {}
export interface IEmojiModel extends mongoose.Model<IEmojiDocument> {}
