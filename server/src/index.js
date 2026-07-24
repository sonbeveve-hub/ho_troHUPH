import { env } from './config/env.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { createApp } from './app.js';

migrate();
seed();

const app = createApp();

app.listen(env.port, () => {
  console.log(`Server đang chạy tại http://localhost:${env.port} (${env.nodeEnv})`);
});
