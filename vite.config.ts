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
    rollupOptions: {
      // Cards go into a hashed chunk so the entry (strategy) stays tiny.
      output: { inlineDynamicImports: false, chunkFileNames: "multisensor-heating-[name]-[hash].js" },
    },
  },
});
