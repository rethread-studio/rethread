import * as express from "express";
import UserModel from "../database/users/users.model";
const router = express.Router();
export default router;

router.get("/me", async (req, res) => {
  const session: any = req.session;
  if (session?.userID) {
    res.json(await UserModel.findById(session.userID));
  } else {
    res.status(401).json({ error: "not_connected" });
  }
});
