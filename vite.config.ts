import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ["7a52-2402-800-6f61-f427-b8ea-925b-37e-6152.ngrok-free.app"],
  },
});
