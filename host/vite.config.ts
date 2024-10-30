import { defineConfig } from "vite";
import tailwindcss from "tailwindcss";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  clearScreen: false,
  plugins: [],
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
