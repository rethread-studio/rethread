require("dotenv").config();

import * as fs from "fs";
import LaureateModel from "./server/database/laureates/laureates.model";
import { IQuestion } from "./server/database/questions/questions.types";
import QuestionModel from "./server/database/questions/questions.model";
import StateModel from "./server/database/state/state.model";
import EmojiModel from "./server/database/emojis/emojis.model";
import { ILaureate } from "./server/database/laureates/laureates.types";
import { IEmoji } from "./server/database/emojis/emojis.types";

export async function importDefaultConfiguration() {
  try {
    await StateModel.collection.drop();
    await LaureateModel.collection.drop();
    await QuestionModel.collection.drop();
    await EmojiModel.collection.drop();
  } catch (error) {
    console.log(error);
  }

  const state = JSON.parse(
    (await fs.promises.readFile("./data/state.json")).toString("utf-8")
  );
  await new StateModel(state).save();

  const laureates: ILaureate[] = JSON.parse(
    (await fs.promises.readFile("./data/laureates.json")).toString("utf-8")
  );
  await Promise.all(laureates.map((data) => new LaureateModel(data).save()));

  const questions: IQuestion[] = JSON.parse(
    (await fs.promises.readFile("./data/questions.json")).toString("utf-8")
  );
  await Promise.all(questions.map((data) => new QuestionModel(data).save()));

  const emojis: IEmoji[] = JSON.parse(
    (await fs.promises.readFile("./data/emojis.json")).toString("utf-8")
  );
  await Promise.all(emojis.map((data) => new EmojiModel(data).save()));
}
