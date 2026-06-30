const { spawn } = require("child_process");

const tunnel = spawn(
  "cloudflared",
  ["tunnel", "run", "medplay-local"],
  {
    windowsHide: true,
    shell: true,
    stdio: "inherit"
  }
);

tunnel.on("exit", (code) => {
  process.exit(code);
});