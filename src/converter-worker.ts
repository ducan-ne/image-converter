import { createBirpc } from "birpc"
import Vips from "wasm-vips"
import VipsModule from "wasm-vips/vips.wasm?url"
import VipsHeifModule from "wasm-vips/vips-heif.wasm?url"
import VipsJxlModule from "wasm-vips/vips-jxl.wasm?url"

export type ServerFunctions = {
  convert: (
    file: Uint8Array,
    fileName: string,
    targetFormat: string,
    quality: number,
  ) => Promise<ArrayBufferLike>
}

async function convert(
  file: Uint8Array,
  fileName: string,
  targetFormat: string,
  quality: number,
) {
  const vipsInstance = await Vips({
    locateFile: (fileName: string) => {
      if (fileName.endsWith("vips.wasm")) {
        fileName = VipsModule
      } else if (fileName.endsWith("vips-heif.wasm")) {
        fileName = VipsHeifModule
      } else if (fileName.endsWith("vips-jxl.wasm")) {
        fileName = VipsJxlModule
      }

      return new URL(fileName, import.meta.url).href
    },
    preRun: (module: any) => {
      // https://github.com/kleisauke/wasm-vips/issues/13#issuecomment-1073246828
      module.setAutoDeleteLater(true)
      module.setDelayFunction((fn: () => void) => {})
    },
  })

  const saveOptions: any = {
    Q: quality,
  }

  if (targetFormat === "avif") {
    saveOptions.effort = 2
  }

  const image = vipsInstance.Image.newFromBuffer(file, fileName, {})

  image.onProgress = (percent) => {
    postMessage({ type: "progress", progress: percent })
  }

  const result = image.writeToBuffer(`file.${targetFormat.toLowerCase()}`, saveOptions)

  return result.buffer
}

createBirpc<{}, ServerFunctions>(
  {
    convert,
  },
  {
    post: (data) => postMessage(data),
    on: (data) => addEventListener("message", (v) => data(v.data)),
  },
)
