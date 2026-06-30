const { spawn } = require("child_process");

const next = spawn("npm.cmd", ["run", "dev"], {
  windowsHide: true,
  cwd: "C:/Medplay/medplay",
  shell: true,
  stdio: "inherit"
});

next.on("exit", (code) => {
  process.exit(code);
});

process.on("SIGINT", () => next.kill());
process.on("SIGTERM", () => next.kill());