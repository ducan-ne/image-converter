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
  resolve: {
    alias: {
      react: "https://bannerify.co/_astro/react.js",
      'react/jsx-runtime': "https://bannerify.co/_astro/react.js",
      "react-dom": "https://bannerify.co/_astro/react-dom.js",
      "framer-motion": "https://bannerify.co/_astro/framer-motion.js",
      "sonner": "https://bannerify.co/_astro/sonner.js",
      "@tanstack/react-query": "https://bannerify.co/_astro/query.js",
      "@nextui-org/react": "https://bannerify.co/_astro/nextui.js",
    },
  },
  build: {
    target: "esnext",
    rollupOptions: {
      input: resolve(__dirname, "src/App.tsx"),
      preserveEntrySignatures: "exports-only",
      output: {
        entryFileNames: "index.js",
        format: "esm",
        // inlineDynamicImports: true,
        manualChunks: {
          // image: ['@imagemagick/magick-wasm/magick.wasm']
        }
      },
    },
  },
  worker: {
    format: "es",
    plugins: () => [comlink()],
  },
})
