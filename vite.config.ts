import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The server serves the built client in production, so set a stable base.
// In dev, /api is proxied to the API server so the app always talks to its own
// origin (no CORS, no hardcoded port) and survives server restarts.
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
    outDir: 'dist/client',
    emptyOutDir: true,
    sourcemap: false,
  },
});