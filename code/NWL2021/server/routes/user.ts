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
            body: 'function(values) { const out = [];for (let i in values) {out.push(values[i]);} return parseInt(out.join("") || 0); }',
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
  ]).limit(3);
  return res.json(users);
});
