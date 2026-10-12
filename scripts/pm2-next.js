const { spawn } = require("child_process");

const next = spawn("npm.cmd", ["run", "start"], {
  windowsHide: true,
  cwd: require("node:path").resolve(__dirname, ".."),
  env: { ...process.env, NODE_ENV: "production" },
  shell: true,
  stdio: "inherit"
});

next.on("exit", (code) => {
  process.exit(code);
});

process.on("SIGINT", () => next.kill());
process.on("SIGTERM", () => next.kill());
