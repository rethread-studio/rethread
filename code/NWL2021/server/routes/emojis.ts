import * as express from "express";
import EmojiModel from "../database/emojis/emojis.model";
const router = express.Router();
export default router;

router.get("/emojis", async (req, res) => {
  res.json(await EmojiModel.find());
});
