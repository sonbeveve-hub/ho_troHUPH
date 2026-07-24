module.exports = {
  apps: [
    {
      name: 'ho-tro-app',
      script: 'server/src/index.js',
      cwd: '.',
      env: {
        NODE_ENV: 'production',
      },
      instances: 1,
      autorestart: true,
      watch: false,
    },
  ],
};
