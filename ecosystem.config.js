// PM2 process file for a no-Docker VPS deployment of apps/web.
// Usage: pm2 start ecosystem.config.js --env production
// See docs/DEPLOYMENT.md#option-b--vps--pm2-no-docker for the full setup.
module.exports = {
  apps: [
    {
      name: "linqkeun-ai-web",
      cwd: "./apps/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
