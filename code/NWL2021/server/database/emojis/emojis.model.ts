import * as mongoose from "mongoose";
const { model } = mongoose;

import { IEmojiDocument, IEmojiModel } from "./emojis.types";
import EmojiSchema from "./emojis.schema";

const EmojiModel = model<IEmojiDocument>("emojis", EmojiSchema) as IEmojiModel;

export default EmojiModel;
