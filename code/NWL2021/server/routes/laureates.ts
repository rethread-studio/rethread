import * as express from "express";
import LaureateModel from "../database/laureates/laureates.model";
const router = express.Router();
export default router;

router.get("/laureates", async (req, res) => {
  res.json(await LaureateModel.find().sort({ used: 1 }));
});

router.get("/laureates/:id", async (req, res) => {
  if (!req.params.id) return res.status(400).json({ error: "Missing id" });
  try {
    const laureate = await LaureateModel.findById(req.params.id);
    if (!laureate) {
      return res.status(400).json({ error: "laureate not found" });
    }
    res.json(laureate);
  } catch (error) {
    return res.status(500).json({ error });
  }
});
