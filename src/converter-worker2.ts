import {
  initializeImageMagick,
  ImageMagick,
  MagickFormat,
} from "@imagemagick/magick-wasm"

// globalThis.Buffer = Buffer
export async function convert(file: Uint8Array, targetFormat: MagickFormat) {
  await fetch(new URL("@imagemagick/magick-wasm/magick.wasm?wasm", import.meta.url))
    .then((res) => res.arrayBuffer())
    .then((wasmBytes) => initializeImageMagick(wasmBytes))

  return new Promise<ArrayBufferLike>(async (resolve, reject) => {
    ImageMagick.read(file, (image) => {
      image.quality = 75;
      image.strip()
      image.gaussianBlur(0.05)
      image.write(targetFormat, (data) => {
        resolve(data)
      })
    })
  })
}
