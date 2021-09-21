import * as express from "express";
import LaureateModel from "../database/laureates/laureates.model";
const router = express.Router();
export default router;

router.get("/laureates", async (req, res) => {
  res.json(await LaureateModel.find());
});
