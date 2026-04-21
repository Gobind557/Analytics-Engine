import { createServer } from 'node:http';
import { createApp } from './app';
import { env } from './config/env';

const app = createApp();
const server = createServer(app);

server.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Unified Event Analytics Engine listening on port ${env.PORT}`);
});
