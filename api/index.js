// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
// It runs the compiled Express app from apps/api/dist, built by the build command.
import { createApp } from '../apps/api/dist/app.js';

export default createApp();
