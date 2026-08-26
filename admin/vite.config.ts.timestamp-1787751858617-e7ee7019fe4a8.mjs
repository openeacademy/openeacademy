// vite.config.ts
import { defineConfig } from "file:///D:/ReactProject/opene/admin/node_modules/vite/dist/node/index.js";
import react from "file:///D:/ReactProject/opene/admin/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "D:\\ReactProject\\opene\\admin";
var vite_config_default = defineConfig({
  plugins: [react()],
  // base: '/admin/' ensures all built asset paths are prefixed with /admin/
  // so they resolve correctly when served from openeacademy.in/admin in production.
  // Traefik strips /admin before forwarding to nginx, so nginx sees /assets/... ✓
  // In local dev (npm run dev), Vite serves at http://localhost:3001 without this prefix.
  base: "/admin/",
  resolve: { alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") } },
  server: {
    port: 3001,
    proxy: { "/api": { target: "http://127.0.0.1:5000", changeOrigin: true } }
  },
  build: { outDir: "dist", sourcemap: true }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxSZWFjdFByb2plY3RcXFxcb3BlbmVcXFxcYWRtaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXFJlYWN0UHJvamVjdFxcXFxvcGVuZVxcXFxhZG1pblxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovUmVhY3RQcm9qZWN0L29wZW5lL2FkbWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgLy8gYmFzZTogJy9hZG1pbi8nIGVuc3VyZXMgYWxsIGJ1aWx0IGFzc2V0IHBhdGhzIGFyZSBwcmVmaXhlZCB3aXRoIC9hZG1pbi9cbiAgLy8gc28gdGhleSByZXNvbHZlIGNvcnJlY3RseSB3aGVuIHNlcnZlZCBmcm9tIG9wZW5lYWNhZGVteS5pbi9hZG1pbiBpbiBwcm9kdWN0aW9uLlxuICAvLyBUcmFlZmlrIHN0cmlwcyAvYWRtaW4gYmVmb3JlIGZvcndhcmRpbmcgdG8gbmdpbngsIHNvIG5naW54IHNlZXMgL2Fzc2V0cy8uLi4gXHUyNzEzXG4gIC8vIEluIGxvY2FsIGRldiAobnBtIHJ1biBkZXYpLCBWaXRlIHNlcnZlcyBhdCBodHRwOi8vbG9jYWxob3N0OjMwMDEgd2l0aG91dCB0aGlzIHByZWZpeC5cbiAgYmFzZTogJy9hZG1pbi8nLFxuICByZXNvbHZlOiB7IGFsaWFzOiB7ICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJykgfSB9LFxuICBzZXJ2ZXI6IHtcbiAgICBwb3J0OiAzMDAxLFxuICAgIHByb3h5OiB7ICcvYXBpJzogeyB0YXJnZXQ6ICdodHRwOi8vMTI3LjAuMC4xOjUwMDAnLCBjaGFuZ2VPcmlnaW46IHRydWUgfSB9LFxuICB9LFxuICBidWlsZDogeyBvdXREaXI6ICdkaXN0Jywgc291cmNlbWFwOiB0cnVlIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlEsU0FBUyxvQkFBb0I7QUFDeFMsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUZqQixJQUFNLG1DQUFtQztBQUl6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxDQUFDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtqQixNQUFNO0FBQUEsRUFDTixTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU8sRUFBRSxFQUFFO0FBQUEsRUFDNUQsUUFBUTtBQUFBLElBQ04sTUFBTTtBQUFBLElBQ04sT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLHlCQUF5QixjQUFjLEtBQUssRUFBRTtBQUFBLEVBQzNFO0FBQUEsRUFDQSxPQUFPLEVBQUUsUUFBUSxRQUFRLFdBQVcsS0FBSztBQUMzQyxDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
