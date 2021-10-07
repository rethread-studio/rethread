module.exports = {
  apps: [
    {
      name: "server",
      script: "server/index.ts",
      exec_mode: "fork",
      watch: true,
      ignore_watch: ["node_modules", "screen", "server/public", ".git", "front-end", "data"],
      interpreter: "./node_modules/.bin/ts-node",
      interpreter_args: "--transpile-only",
    },
    {
      name: "screen",
      script: "screen/src/index.ts",
      exec_mode: "fork",
      watch: true,
      ignore_watch: ["node_modules", "server", "screen/public", ".git", "front-end", "data"],
      interpreter: "./node_modules/.bin/ts-node",
      interpreter_args: "--transpile-only",
    },
  ],
};
