import * as mongoose from "mongoose";

export interface IUser {
  _id: string;
  events: { [key: string]: number };
  creationDate: Date;
}

export interface IUserDocument extends Omit<IUser, "_id">, mongoose.Document {}
export interface IUserModel extends mongoose.Model<IUserDocument> {}
