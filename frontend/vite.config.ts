import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  css: {
    preprocessorOptions: {
      // Add any CSS preprocessor options if needed
    },
  },
  build: {
    target: "esnext", // This enables support for top-level await
    rollupOptions: {
      output: {
        manualChunks: {
          // Split AWS Amplify into a separate chunk
          "vendor-amplify": ["aws-amplify", "@aws-amplify/ui-react"],
          // Split React and related packages
          "vendor-react": ["react", "react-dom"],
          // Split other major dependencies
          "vendor-ui": [
            "@cloudscape-design/components",
            "@cloudscape-design/global-styles",
          ],
        },
      },
    },
    // Increase the warning limit if you still want to see warnings for larger chunks
    chunkSizeWarningLimit: 1000,
  },
  resolve: {
    alias: {
      "./runtimeConfig": "./runtimeConfig.browser", // This helps with Amplify configuration
    },
  },
});
