import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // base: '/admin/' ensures all built asset paths are prefixed with /admin/
  // so they resolve correctly when served from openeacademy.in/admin in production.
  // Traefik strips /admin before forwarding to nginx, so nginx sees /assets/... ✓
  // In local dev (npm run dev), Vite serves at http://localhost:3001 without this prefix.
  base: '/admin/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 3001,
    proxy: { '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: true },
});
