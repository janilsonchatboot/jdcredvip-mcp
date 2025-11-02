module.exports = {
  apps: [
    {
      name: "codex-realtime",
      script: "dist/agents/realtime-agent.js",
      env: {
        NODE_ENV: "production"
      },
      watch: false,
      max_restarts: 10,
      restart_delay: 4000
    }
  ]
};
