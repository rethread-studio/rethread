import mongoose from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  _id: mongoose.Types.ObjectId,
  laureateID: mongoose.Types.ObjectId,
  events: mongoose.Schema.Types.Mixed,
  creationDate: { type: Date, default: Date.now },
});

export default UserSchema;
