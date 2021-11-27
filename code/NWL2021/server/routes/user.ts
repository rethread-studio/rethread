import * as express from "express";
import UserModel from "../database/users/users.model";
const router = express.Router();
export default router;

router.get("/me", async (req, res) => {
  const session: any = req.session;
  if (session?.userID) {
    const user = (await UserModel.findById(session.userID)).toJSON();
    let out = 0;
    for (let i in user.events) {
      out += user.events[i];
    }
    (user as any).score = out;
    res.json(user);
  } else {
    res.status(401).json({ error: "not_connected" });
  }
});

router.get("/", async (req, res) => {
  const users = await UserModel.aggregate([
    {
      $lookup: {
        from: "laureates",
        localField: "laureateID",
        foreignField: "_id",
        as: "tmp",
      },
    },
    {
      $project: {
        laureate: { $first: "$tmp" },
        events: 1,
        score: {
          $function: {
            body: "function(values) { let out = 0;for (let i in values) {out += values[i];} return out; }",
            args: ["$events"],
            lang: "js",
          },
        },
        _id: 0,
      },
    },
    {
      $sort: {
        score: -1,
      },
    },
  ]).limit(2);
  return res.json(users);
});
