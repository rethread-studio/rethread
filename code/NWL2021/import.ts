require("dotenv").config();

import got from "got";
import * as fs from "fs";
import { connect } from "./server/src/database/database";
import LaureateModel from "./server/src/database/laureates/laureates.model";
import { IQuestion } from "./server/src/database/questions/questions.types";
import QuestionModel from "./server/src/database/questions/questions.model";
import StateModel from "./server/src/database/state/state.model";

export async function importDefaultConfiguration() {
  await new StateModel({
    width: 12,
    height: 6,
    unitSize: 100,
    walls: [],
  }).save();

  const laureatePromises = (
    JSON.parse((await got("http://api.nobelprize.org/v1/laureate.json")).body)
      .laureates as Array<any>
  )
    .filter((f) => f.gender == "female")
    .map((data) => new LaureateModel(data).save());
  await Promise.all(laureatePromises);

  const questions: IQuestion[] = JSON.parse(
    (await fs.promises.readFile("./questions.json")).toString("utf-8")
  );
  await Promise.all(questions.map((data) => new QuestionModel(data).save()));
}
