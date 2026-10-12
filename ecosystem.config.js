module.exports = {
  apps: [
    {
      name: "medplay-web",
      cwd: __dirname,
      script: "C:/Program Files/nodejs/npm.cmd",
      args: "run start",
      env: { NODE_ENV: "production" },
      interpreter: "none"
    }
  ]
};
