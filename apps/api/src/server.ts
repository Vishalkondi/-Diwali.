import { createApp } from './app.js';
import { pool } from './db/client.js';
import { env } from './env.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Utsavly API listening on http://localhost:${env.PORT}`);
});

let closing = false;
function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`${signal} received, shutting down…`);
  // Open SSE streams would hold the server open; close idle and active sockets.
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  server.closeAllConnections();
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
