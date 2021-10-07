import * as mongoose from "mongoose";
const { model } = mongoose;

import { ILaureateDocument, ILaureateModel } from "./laureates.types";
import LaureateSchema from "./laureates.schema";

const LaureateModel = model<ILaureateDocument>(
  "Laureate",
  LaureateSchema
) as ILaureateModel;

export default LaureateModel;
