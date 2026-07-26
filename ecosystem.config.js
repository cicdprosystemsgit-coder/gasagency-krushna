// PM2 Process Manager Configuration
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: "gasagency",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "./logs/pm2-error.log",
      out_file:   "./logs/pm2-out.log",
      merge_logs: true,
    },
  ],
};
