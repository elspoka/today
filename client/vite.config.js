import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { readFileSync } from "fs";
import { resolve } from "path";

const { version } = JSON.parse(readFileSync(resolve("./package.json"), "utf-8"));

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("ui5-")
        }
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  base: "./",
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false
  }
});
