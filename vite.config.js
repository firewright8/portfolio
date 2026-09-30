import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@designcodeio/threeui/style.css": path.resolve(__dirname, "src/shaders/threeui.css"),
      "@designcodeio/threeui": path.resolve(__dirname, "src/index.ts"),
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
