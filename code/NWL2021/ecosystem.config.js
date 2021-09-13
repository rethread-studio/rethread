module.exports = {
  apps: [
    {
      name: "NWL20201",
      script: "server/index.ts",
      exec_mode: "fork",
      watch: true,
      ignore_watch: ["node_modules", "public", ".git"],
      interpreter: "node",
      interpreter_args: "--require ts-node/register",
    },
  ],
};
