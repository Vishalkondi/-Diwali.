import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const API = process.env.API_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // Same-origin /api in development, so the session cookie and SSE just work.
    proxy: { '/api': { target: API, changeOrigin: false } },
  },
  preview: { port: 4173, proxy: { '/api': { target: API } } },
  build: { target: 'es2022', sourcemap: true },
});
