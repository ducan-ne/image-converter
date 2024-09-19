import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import cssInject from "vite-plugin-css-injected-by-js"
import { resolve } from "node:path"
import fs from "node:fs/promises"

export default defineConfig({
  base: process.env.TARGET === "bannerify" ? "/image-converter/" : undefined,
  plugins: [
    react(),
    cssInject(),
    {
      name: 'index.js',
      apply: 'build',
      async writeBundle() {
        const manifest = JSON.parse(await fs.readFile("dist/.vite/manifest.json", "utf-8"))
        await fs.writeFile("dist/index.js", `export {default} from "./${manifest["src/App.tsx"].file}"`)
      }
     }
  ],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    } as any,
    exclude: ["wasm-vips", "vips-es6"],
  },
  build: {
    target: "esnext",
    manifest: true,
    rollupOptions: process.env.TARGET === "bannerify" ? {
      external: ["react/jsx-runtime", "react", "react-dom"],
      input: resolve(__dirname, "src/App.tsx"),
      preserveEntrySignatures: "exports-only",
      output: {
        entryFileNames: "index.[hash].js",
        format: "esm",
        manualChunks: {
        },
      },
    } : undefined,
  },
  worker: {
    format: "es",
  },
})
