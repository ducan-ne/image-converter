import {
  initializeImageMagick,
  ImageMagick,
  Magick,
  MagickFormat,
  Quantum,
} from "@imagemagick/magick-wasm"

await fetch(new URL("@imagemagick/magick-wasm/magick.wasm?wasm", import.meta.url))
  .then((res) => res.arrayBuffer())
  .then((wasmBytes) => initializeImageMagick(wasmBytes))

ImageMagick.read("logo:", (image) => {
  image.resize(100, 100)
  image.blur(1, 5)
  console.log(image.toString())

  image.write(MagickFormat.Jpeg, (data) => {
    console.log(data.length)
  })
})

export default {}
