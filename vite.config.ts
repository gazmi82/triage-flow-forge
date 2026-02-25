import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8082",
        changeOrigin: true,
      },
      "/health": {
        target: "http://127.0.0.1:8082",
        changeOrigin: true,
      },
      "/v1": {
        target: "http://127.0.0.1:8082",
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      axios: path.resolve(__dirname, "./src/lib/axios.ts"),
    },
  },
}));
