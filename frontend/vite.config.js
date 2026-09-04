import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies API + uploads to the Express backend on :4173,
// so the browser only ever talks to one origin (cookie/CSRF friendly).
const API = 'http://localhost:4173';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      // Dev-only diagnostics: if the backend is down, Vite answers 500 — log
      // the real cause here so it's never a mystery again.
      '/api': {
        target: API,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.error(`[vite proxy] ${req.method} ${req.url} → ${err.code || err.message} (backend at ${API} unreachable?)`);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            if (proxyRes.statusCode >= 500) console.error(`[vite proxy] ${req.method} ${req.url} → backend answered ${proxyRes.statusCode}`);
          });
        },
      },
      '/uploads': {
        target: API,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.error(`[vite proxy] ${req.method} ${req.url} → ${err.code || err.message} (backend at ${API} unreachable?)`);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
