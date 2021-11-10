import * as express from "express";
import LaureateModel from "../database/laureates/laureates.model";
const router = express.Router();
export default router;

router.get("/laureates", async (req, res) => {
  res.json(await LaureateModel.find().sort({ used: 1 }));
});

router.get("/laureates/:id", async (req, res) => {
  if (req.params.id == "null")
    return res.status(400).json({ error: "Missing id" });
  console.log(req.params.id == null, "api");
  res.json(await LaureateModel.findById(req.params.id));
});
