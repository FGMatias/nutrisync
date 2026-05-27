import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },

  test: {
    environment: "jsdom",
  },
  //  server: {
  //    host: "172.31.210.253",
  //    port: 5173,
  //  },
  //server: {
  //  host: "172.31.210.253",
  //  port: 5173,
  //host: "172.31.210.253",
  //port: 5173,
  //},
});
