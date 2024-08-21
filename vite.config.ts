import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import cssInject from "vite-plugin-css-injected-by-js"
import { resolve } from "node:path"

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
  ],
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    } as any,
  },
  resolve: {
    alias: process.env.NODE_ENV === "production" ? {
      // 'react/jsx-runtime': "https://cdn.jsdelivr.net/npm/react@18.3.0-canary-b30030471-20240117/jsx-runtime/+esm",
      // "react": "https://cdn.jsdelivr.net/npm/react@18.3.0-canary-b30030471-20240117/+esm",
      // "react-dom": "https://bannerify.co/_astro/react-dom.js",
      "framer-motion": "https://bannerify.co/_astro/framer-motion.js",
      // "sonner": "https://bannerify.co/_astro/sonner.js",
      // "@tanstack/react-query": "https://bannerify.co/_astro/query.js",
      // "@nextui-org/react": "https://bannerify.co/_astro/nextui.js",
    }: {},
  },
  build: {
    target: "esnext",
    rollupOptions: {
      external: [
        "react/jsx-runtime",
        "react",
        "react-dom",
      ],
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
  },
})
