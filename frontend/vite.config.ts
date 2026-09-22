import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The backend serves the built frontend in production, so set a stable base.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8735,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});