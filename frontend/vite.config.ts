import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend serves the built frontend in production, so set a stable base.
// In dev, /api is proxied to the backend so the app always talks to its own
// origin (no CORS, no hardcoded port) and survives backend restarts.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8735,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8734',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});