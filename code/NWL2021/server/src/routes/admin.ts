import * as express from "express";
import LaureateModel from "../database/laureates/laureates.model";
const router = express.Router();
export default router;

router.post("laureate", (req, res) => {
  const data = req.body;
  new LaureateModel(data).save();
});
