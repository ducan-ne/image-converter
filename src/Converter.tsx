import { table } from "@nextui-org/theme"
import { useState } from "react"
import {
  Button,
  Cell,
  Column,
  FileTrigger,
  Row,
  Table,
  TableBody,
  TableHeader,
} from "react-aria-components"
import { Toaster } from "sonner"
import {
  MagickFormat,
} from "@imagemagick/magick-wasm"
import "./build.css"
import { proxy, useSnapshot } from "valtio"
const tableCls = table()

type Image = {
  loading: boolean
  previewUrl: string
  downloadUrl: string
  originalSize: number
  convertedSize: number
  filename: string
  sizeChange: number // in %
  format: MagickFormat
  duration: number
}

const state = proxy<{
  convertedImages: Array<Image>
}>({
  convertedImages: [],
})

export type Formats = "webp" | "jpeg" | "png" | "avif" | "heic" | "bmp" | "ico" | "tiff" | "pnm" | "tga" | "farbfeld"

const Converter = () => {
  const { convertedImages } = useSnapshot(state)
  const [targetFormat, setTargetFormat] = useState<MagickFormat>(MagickFormat.WebP)

  return (
    <section id="image-converter" style={{ width: "100%", height: "100%" }}>
      <div className="flex gap-4 flex-col items-center">
        <Toaster position="top-center" />
        <FileTrigger
          allowsMultiple
          onSelect={async (e) => {
            if (!e) return
            let files = Array.from(e)
            if (files.length === 0) return
            for (const file of files) {
              ;(async function () {
                const instance = new ComlinkWorker<typeof import("./converter-worker2.ts")>(
                  new URL("./converter-worker2.ts", import.meta.url),
                )
                const index = state.convertedImages.push({
                  loading: true,
                  originalSize: file.size,
                  previewUrl: URL.createObjectURL(file),
                  convertedSize: 0,
                  sizeChange: 0,
                  format: targetFormat,
                  duration: 0,
                  downloadUrl: "",
                  filename: file.name,
                })
                const start = Date.now()
                const converted = await instance.convert(new Uint8Array(await file.arrayBuffer()), targetFormat)
                
                const blob = new Blob([converted])
                const previewUrl = URL.createObjectURL(blob)
                // state.convertedImages[index - 1].previewUrl = previewUrl
                state.convertedImages[index - 1].previewUrl = previewUrl
                state.convertedImages[index - 1].convertedSize = blob.size
                state.convertedImages[index - 1].downloadUrl = URL.createObjectURL(blob)
                state.convertedImages[index - 1].sizeChange =
                  ((file.size - blob.size) / file.size) * 100
                state.convertedImages[index - 1].loading = false
                state.convertedImages[index - 1].format = targetFormat
                state.convertedImages[index - 1].duration = Date.now() - start
              })().catch(console.error)
            }
          }}
          acceptedFileTypes={["image/*"]}
        >
          <Button className="appearance-none inline-flex hover:shadow-2xl transition-all duration-300 hover:scale-105 dragging:bg-gray-500 items-center group space-x-2.5 bg-black text-white py-10 px-12 rounded-2xl cursor-pointer w-fit text-xl">
            Choose file or drag here
          </Button>
        </FileTrigger>
        <select
          value={targetFormat}
          onChange={(e) => setTargetFormat(e.target.value as Formats)}
          className="w-full"
        >
          <option value={MagickFormat.WebP}>WebP</option>
          <option value={MagickFormat.Jpeg}>JPEG</option>
          <option value={MagickFormat.Png}>PNG</option>
          <option value={MagickFormat.Avif}>AVIF</option>
          <option value={MagickFormat.Heic}>HEIC</option>
          <option value={MagickFormat.Bmp}>BMP</option>
          <option value={MagickFormat.Ico}>ICO</option>
          <option value={MagickFormat.Tiff}>TIFF</option>
          <option value={MagickFormat.Gif}>GIF</option>
          <option value={MagickFormat.Pdf}>PDF</option>
          <option value={MagickFormat.Svg}>SVG</option>
          <option value={MagickFormat.Psd}>PSD</option>
          <option value={MagickFormat.Tga}>TGA</option>
          <option value={MagickFormat.Eps}>EPS</option>
          <option value={MagickFormat.Raw}>RAW</option>
        </select>
        <Table aria-label="Converted images" className={tableCls.table()}>
          <TableHeader className={tableCls.thead()}>
            <Column isRowHeader className={`${tableCls.th()} w-12`}>
              No
            </Column>
            <Column className={`${tableCls.th()} w-32`}>State</Column>
            <Column className={`${tableCls.th()}`}>Image</Column>
            <Column className={`${tableCls.th()} w-32`}>Size change</Column>
            <Column className={`${tableCls.th()} w-32`}>Duration</Column>
            <Column className={`${tableCls.th()} w-32`}>Actions</Column>
          </TableHeader>
          <TableBody className={tableCls.tbody()}>
            {convertedImages.map((image, index) => (
              <Row className={tableCls.tr()} key={index}>
                <Cell className={tableCls.td()}>{index + 1}</Cell>
                <Cell className={tableCls.td()}>{image.loading ? "Loading..." : "Done"}</Cell>
                <Cell className={tableCls.td()}>
                  <img
                    src={image.previewUrl}
                    alt="converted"
                    className="max-h-20 object-scale-down rounded-lg"
                  />
                </Cell>
                <Cell className={tableCls.td()}>
                  {!image.loading &&
                    (image.sizeChange > 0 ? (
                      <span className="text-red-500">+{image.sizeChange.toFixed(2)}%</span>
                    ) : (
                      <span className="text-green-500">{image.sizeChange.toFixed(2)}%</span>
                    ))}
                </Cell>
                <Cell className={tableCls.td()}>
                  {image.duration > 1000
                    ? `${(image.duration / 1000).toFixed(2)}s`
                    : `${image.duration}ms`}
                </Cell>
                <Cell className={tableCls.td()}>
                  <Button isDisabled={image.loading} onPress={() => {
                    const a = document.createElement("a")
                    a.href = image.downloadUrl
                    a.download = image.filename.replace(/\.[^/.]+$/, "") + "." + targetFormat.toLowerCase()
                    a.click()
                  }}>
                    Download
                  </Button>
                </Cell>
              </Row>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

export default Converter
