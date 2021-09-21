import * as mongoose from "mongoose";
const { model } = mongoose;

import { IStateDocument, IStateModel } from "./state.types";
import StateSchema from "./state.schema";

const StateModel = model<IStateDocument>("State", StateSchema) as IStateModel;

export default StateModel;
