import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "frontend-src/index.ts",
      formats: ["es"],
      fileName: () => "multisensor-heating.js",
    },
    outDir: "custom_components/multisensor_heating/frontend",
    emptyOutDir: true,
    sourcemap: false,
  },
});
