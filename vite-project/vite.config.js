import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: "../",
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("ethers") || id.includes("@ethersproject")) {
              return "ethers";
            }
            if (id.includes("chart.js") || id.includes("react-chartjs-2")) {
              return "charts";
            }
            if (id.includes("gsap")) {
              return "gsap";
            }
            return "vendor";
          }
        },
      },
    },
  },
});
