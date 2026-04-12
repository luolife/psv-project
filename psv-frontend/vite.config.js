// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    // Em desenvolvimento: redireciona chamadas /auth /participants /sessions
    // para o backend FastAPI rodando em localhost:8000
    // Assim o frontend em :5173 fala com o backend em :8000 sem CORS
    proxy: {
      "/auth":         "http://localhost:8000",
      "/participants": "http://localhost:8000",
      "/sessions":     "http://localhost:8000",
    },
  },

  build: {
    // Vercel usa "dist" — não altere
    // Para rodar localmente via FastAPI, mude para "../psv/static"
    outDir: "dist",
    emptyOutDir: true,
  },
});
