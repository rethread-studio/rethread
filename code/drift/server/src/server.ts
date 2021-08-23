import * as express from "express";
import * as fs from "fs";
import * as core from "cors";
import { join, resolve } from "path";
import * as compression from "compression";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { escape } from "sanitizer";
import { generateFromString } from "generate-avatar";

import * as util from "./utils";
import { OUTPUT_PATH } from "./config";

const app = express();
app.use(core());
app.use("/assets", express.static(__dirname + "/../../assets"), {
  etag: true,
  lastModified: true,
  maxAge: 3600000, // 1h
});
app.use("/audio", express.static(__dirname + "/../../audio"));

app.use(compression());
app.use("/js", express.static(__dirname + "/../../js"));
app.use("/site.webmanifest", express.static(__dirname + "/../../site.webmanifest"));
app.use("/img", express.static(__dirname + "/../../img"));
app.use("/css", express.static(__dirname + "/../../css"));
app.use("/webfonts", express.static(__dirname + "/../../webfonts"));

const api = express.Router();
app.use("/api", api);

async function extractCoverage(path) {
  if (!fs.existsSync(path)) {
    return null;
  }
  const minPath = path.replace("coverage.json", "coverage.min.json");
  if (fs.existsSync(minPath)) {
    return JSON.parse(
      await (await fs.promises.readFile(minPath)).toString("utf-8")
    );
  }
  const data = JSON.parse(
    await (await fs.promises.readFile(path)).toString("utf-8")
  );
  const output = [];
  for (let script of data) {
    for (let func of script.functions) {
      for (let range of func.ranges) {
        output.push([range.endOffset - range.startOffset, range.count]);
      }
    }
  }
  await fs.promises.writeFile(minPath, JSON.stringify(output));
  return output;
}
async function extractCSSCoverage(path) {
  if (!fs.existsSync(path)) {
    return null;
  }
  const minPath = path.replace("css_coverage.json", "css_coverage.min.json");
  if (fs.existsSync(minPath)) {
    return JSON.parse(
      await (await fs.promises.readFile(minPath)).toString("utf-8")
    );
  }

  const data = JSON.parse(
    await (await fs.promises.readFile(path)).toString("utf-8")
  );
  const output = [];
  for (let range of data) {
    output.push(range.endOffset - range.startOffset);
  }
  await fs.promises.writeFile(minPath, JSON.stringify(output));
  return output;
}

api.get("/site/:site/coverages/css", async (req, res) => {
  if (!fs.existsSync(join(OUTPUT_PATH, req.params.site))) {
    return res.sendStatus(404);
  }
  const files = await fs.promises.readdir(join(OUTPUT_PATH, req.params.site));
  const promises = [];
  for (let visit of files) {
    promises.push(
      extractCSSCoverage(
        join(OUTPUT_PATH, req.params.site, visit, "css_coverage.json")
      )
    );
  }
  const coverages = await Promise.all(promises);
  const output = {};
  for (let index = 0; index < files.length; index++) {
    const visit = files[index];
    const coverage = coverages[index];
    if (coverage == null) {
      continue;
    }
    output[visit] = coverage;
  }
  res.json(output);
});

api.get("/site/:site/coverages/js", async (req, res) => {
  if (!fs.existsSync(join(OUTPUT_PATH, req.params.site))) {
    return res.sendStatus(404);
  }
  const files = await fs.promises.readdir(join(OUTPUT_PATH, req.params.site));
  const promises = [];
  for (let visit of files) {
    promises.push(
      extractCoverage(
        join(OUTPUT_PATH, req.params.site, visit, "coverage.json")
      )
    );
  }
  const coverages = await Promise.all(promises);
  const output = {};
  for (let index = 0; index < files.length; index++) {
    const visit = files[index];
    const coverage = coverages[index];
    if (coverage == null) {
      continue;
    }
    output[visit] = coverage;
  }
  res.json(output);
});

api.get("/times", async (req, res) => {
  res.json(await util.getTimeline());
});

api.get("/sites", async (req, res) => {
  res.json(await util.getSites());
});

api.get("/site/:site/visits", async (req, res) => {
  if (!fs.existsSync(join(OUTPUT_PATH, req.params.site))) {
    return res.sendStatus(404);
  }
  const files = await fs.promises.readdir(join(OUTPUT_PATH, req.params.site));
  res.json(files);
});

api.get("/site/:site/:visit/coverage/js", async (req, res) => {
  try {
    res.sendFile(
      await util.getJSCoverage({
        site: req.params.site,
        timestamp: req.params.visit,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/site/:site/:visit/coverage/css", async (req, res) => {
  try {
    res.sendFile(
      await util.getCSSCoverage({
        site: req.params.site,
        timestamp: req.params.visit,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/site/:site/:visit/screenshot", async (req, res) => {
  try {
    res.sendFile(
      await util.getScreenshot({
        site: req.params.site,
        timestamp: req.params.visit,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/site/:site/:visit/network", async (req, res) => {
  try {
    res.sendFile(
      await util.getNetwork({
        site: req.params.site,
        timestamp: req.params.visit,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/site/:site/:visit/profile", async (req, res) => {
  try {
    res.sendFile(
      await util.getProfile({
        site: req.params.site,
        timestamp: req.params.visit,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/time/:time/:site/coverage/js", async (req, res) => {
  try {
    res.sendFile(
      await util.getJSCoverage({
        site: req.params.site,
        time: req.params.time,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/time/:time/:site/coverage/css", async (req, res) => {
  try {
    res.sendFile(
      await util.getCSSCoverage({
        site: req.params.site,
        time: req.params.time,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});


api.get("/time/:time/:site/network", async (req, res) => {
  try {
    res.sendFile(
      await util.getNetwork({
        site: req.params.site,
        time: req.params.time,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/time/:time/:site/profile", async (req, res) => {
  try {
    res.sendFile(
      await util.getProfile({
        site: req.params.site,
        time: req.params.time,
      })
    );
  } catch (error) {
    return res.sendStatus(404);
  }
});

api.get("/chat/user/:uuid/avatar", async (req, res) => {
  res.type("svg").send(generateFromString(req.params.uuid));
});

api.get("/vote/websites", async (req, res) => {
  const files = await fs.promises.readdir(join(__dirname, "..", "websites"));
  res.json(
    files
      .filter((f) => f.indexOf(".steps") > -1)
      .map((f) => f.replace(".steps", ""))
  );
});


app.get("*", (req, res) =>
  res.sendFile(resolve(__dirname + "/../../index.html"))
);

const server = app.listen(8080, () => {
  console.log("Server listening on port: 8080");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

interface User {
  id: string;
  username: string;
}
let users: User[] = [];
const lastMessages = [];

let votes: { [key: string]: User[] } = {};
const voteInterval = 30;
let voteTime = new Date();
voteTime.setSeconds(voteTime.getSeconds() + voteInterval);

setInterval(() => {
  if (voteTime > new Date()) {
    return;
  }
  let elected = "drift";
  let max = 0;
  for (let website in votes) {
    if (votes[website].length > max) {
      elected = website;
      max = votes[website].length;
    }
  }
  votes = {};
  voteTime = new Date();
  voteTime.setSeconds(voteTime.getSeconds() + voteInterval);
  io.emit("elected", { website: elected, voteTime });
}, 500);

//listen on every connection
io.on("connection", (socket) => {
  const user: User = {
    username: "Anonymous",
    id: uuid(),
  };
  users.push(user);
  socket.data.user = user;

  socket.emit("welcome", {
    username: user.username,
    id: user.id,
    voteTime,
    lastMessages,
  });

  io.emit("users", users);

  //listen on change_username
  socket.on("change_username", (data) => {
    user.username = escape(data.username);
    if (data.id) {
      user.id = escape(data.id);
    }
  });

  //listen on new_message
  socket.on("new_message", (data: { message }) => {
    lastMessages.push({
      message: escape(data.message),
      user,
    });
    if (lastMessages.length > 100) {
      lastMessages.shift();
    }
    //broadcast the new message
    io.sockets.emit("new_message", {
      message: escape(data.message),
      user,
    });
  });

  //listen on on_emoji
  socket.on("emoji", (data: { emoji }) => {
    data.emoji.emoji = escape(data.emoji.emoji);
    io.sockets.emit("new_message", {
      message: `${user.username} says: ${data.emoji.emoji}`,
      user,
    });
    io.sockets.emit("on_emoji", {
      emoji: data.emoji,
      user,
    });
  });

  socket.on("typing", () => {
    io.sockets.emit("typing", user);
  });
  socket.on("stop_typing", () => {
    io.sockets.emit("stop_typing", user);
  });

  socket.on("page", (data: { page: string }) => {
    io.sockets.emit("on_page", { user, page: data.page });
  });

  socket.on("vote", (data: { website: string }) => {
    if (!votes[data.website]) {
      votes[data.website] = [];
    }
    if (votes[data.website].filter((u) => u.id == user.id).length > 0) {
      return;
    }
    votes[data.website].push(user);
    io.sockets.emit("on_vote", {
      website: data.website,
      user,
    });
  });
  socket.on("votes", () => {
    socket.emit("votes", votes);
  });

  //Disconnect
  socket.on("disconnect", () => {
    users = users.filter((x) => x !== user);
    io.emit("users", users);
  });
});
