import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
      "/parse_rubric": "http://localhost:8000",
      "/parse_rubric_pdf": "http://localhost:8000",
      "/structure": "http://localhost:8000",
      "/structure_pdf": "http://localhost:8000",
      "/score_essay": "http://localhost:8000",
      "/score_essay_pdf": "http://localhost:8000",
    },
  },
});
