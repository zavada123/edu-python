import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Relative base so the demo works from GitHub Pages (/edu-python/) and from any subfolder.
export default defineConfig({
  base: "./",
  plugins: [react()],
  // The worker is a module worker: MicroPython uses top-level await.
  worker: { format: "es" },
  // MicroPython finds its `.wasm` by its own URL: dev pre-bundling would move the module away from the file.
  optimizeDeps: { exclude: ["@micropython/micropython-webassembly-pyscript"] },
  test: {
    include: ["test/**/*.test.ts"],
    testTimeout: 30_000
  }
})
