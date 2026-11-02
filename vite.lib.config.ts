import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// The package build: four ES entries and one CSS file in lib/. The demo build (vite.config.ts) goes to dist/.
// The Python texts (`?raw`) are built into lib/; React, Effect, CodeMirror and MicroPython stay outside: the page
// installs them once and bundles them itself.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "lib",
    emptyOutDir: true,
    // The page that uses the package minifies it with its own build.
    minify: false,
    lib: {
      entry: { engine: "src/engine.ts", core: "src/core.ts", worker: "src/worker.ts", react: "src/react.ts" },
      formats: ["es"],
      cssFileName: "style"
    },
    rollupOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^effect($|\/)/, /^@codemirror\//, /^@lezer\//, /^@micropython\//, /^lucide-react($|\/)/]
    }
  }
})
