// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
// It runs the compiled Express app from apps/api/dist, built by the build command.
// JWT_SECRET is optional here: the API derives one from DATABASE_URL on Vercel (apps/api/src/env.ts).
const missing = ['DATABASE_URL'].filter((k) => !process.env[k]);

let handler;
if (missing.length) {
  // Not configured yet: answer every request with a clear error instead of crashing on startup.
  handler = (_req, res) => {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: 'The Utsavly store isn’t connected to its database yet. Please check back soon.' }));
  };
} else {
  const { createApp } = await import('../apps/api/dist/app.js');
  handler = createApp();
}

export default handler;
