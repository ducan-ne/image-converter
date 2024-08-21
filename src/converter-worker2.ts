import {
  initializeImageMagick,
  ImageMagick,
  MagickFormat,
} from "@imagemagick/magick-wasm"
import { createBirpc } from "birpc"

export type ServerFunctions = {
  convert: (file: Uint8Array, targetFormat: MagickFormat, quality: number) => Promise<ArrayBufferLike>
}

// globalThis.Buffer = Buffer
async function convert(file: Uint8Array, targetFormat: MagickFormat, _quality: number) {
  await fetch(new URL("@imagemagick/magick-wasm/magick.wasm?wasm", import.meta.url))
    .then((res) => res.arrayBuffer())
    .then((wasmBytes) => initializeImageMagick(wasmBytes))

  return new Promise<ArrayBufferLike>(async (resolve, reject) => {
    try {
      ImageMagick.readCollection(file, (image) => {
        // image.quality = quanlity;
        // image.strip()
        // image.optimize()
        image.coalesce()
        image.write(targetFormat, (data) => {
          resolve(data)
        })
      })
    } catch(e) {
      reject(e)
    }
  })
}

createBirpc<{}, ServerFunctions>(
  {
    convert,
  },
  {
    post: data => postMessage(data),
    on: data => addEventListener("message", v => data(v.data)),
    // serialize: v => JSON.stringify(v),
    // deserialize: v => JSON.parse(v),
  },
)
