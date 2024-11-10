import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      // Add any CSS preprocessor options if needed
    },
  },
  resolve: {
    alias: {
      "./runtimeConfig": "./runtimeConfig.browser", // This helps with Amplify configuration
    },
  },
});
