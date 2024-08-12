import { Buffer } from "buffer"
import type { Formats } from "./Converter.tsx"

globalThis.Buffer = Buffer
export async function convert(file: File, targetFormat: Formats) {
  const { Transformer, losslessCompressPngSync, losslessCompressPng, pngQuantizeSync, compressJpegSync, jpegQuantizeSync } = await import("@napi-rs/image")
  
  const buffer = await file.arrayBuffer().then((arrayBuffer) => Buffer.from(arrayBuffer))
  
  const transformer = new Transformer(buffer)
  return losslessCompressPngSync(buffer) as Uint8Array;

  switch (targetFormat) {
    case 'webp':
      return transformer.webpLosslessSync() as Uint8Array;
    case 'jpeg':
      return transformer.jpegSync() as Uint8Array;
    case 'png':
      return transformer.pngSync() as Uint8Array;
    case 'avif':
      return transformer.avifSync() as Uint8Array;
    case 'bmp':
      return transformer.bmpSync() as Uint8Array;
    case 'ico':
      return transformer.icoSync() as Uint8Array;
    case 'tiff':
      return transformer.tiffSync() as Uint8Array;
    case 'pnm':
      return transformer.pnmSync() as Uint8Array;
    case 'tga':
      return transformer.tgaSync() as Uint8Array;
    case 'farbfeld':
      return transformer.farbfeldSync() as Uint8Array;
    default:
      throw new Error(`Unsupported format: ${targetFormat}`);
  }
}