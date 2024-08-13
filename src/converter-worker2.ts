import {
  initializeImageMagick,
  ImageMagick,
  MagickFormat,
  MagickImageCollection,
} from "@imagemagick/magick-wasm"

// globalThis.Buffer = Buffer
export async function convert(file: Uint8Array, targetFormat: MagickFormat, quanlity: number) {
  await fetch(new URL("@imagemagick/magick-wasm/magick.wasm?wasm", import.meta.url))
    .then((res) => res.arrayBuffer())
    .then((wasmBytes) => initializeImageMagick(wasmBytes))

  return new Promise<ArrayBufferLike>(async (resolve, reject) => {
    try {
      ImageMagick.readCollection(file, (image) => {
        // image.quality = quanlity;
        // image.strip()
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
