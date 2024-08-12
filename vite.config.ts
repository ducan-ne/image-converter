import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import cssInject from "vite-plugin-css-injected-by-js"
import { resolve } from "node:path"
import { comlink } from "vite-plugin-comlink"

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // ['babel-plugin-react-compiler', {}],
        ],
      },
    }),
    ,
    cssInject(),
    comlink() as any,
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    } as any,
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: resolve(__dirname, "src/App.tsx"),
      preserveEntrySignatures: "exports-only",
      external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
      output: {
        entryFileNames: "index.js",
        format: "esm",
        inlineDynamicImports: true,
      },
    },
  },
  worker: {
    format: "es",
    plugins: () => [comlink()],
  },
})
