import { table } from "@nextui-org/theme"
import { useState } from "react"
import {
  Button,
  Cell,
  Column,
  DropZone,
  FileTrigger,
  Row,
  Table,
  TableBody,
  TableHeader,
  type FileDropItem,
} from "react-aria-components"
import { Toaster } from "sonner"
import { MagickFormat } from "@imagemagick/magick-wasm"
import { Spinner } from "@nextui-org/react"
import { proxy, useSnapshot } from "valtio"
import { AnimatePresence, motion } from "framer-motion"
import workerUrl from "./converter-worker?worker&url"
import { createBirpc } from "birpc"
import MotionNumber from "motion-number"
import type { ServerFunctions } from "./converter-worker"
const tableCls = table()

const js = `import ${JSON.stringify(new URL(workerUrl, import.meta.url))}`
const blob = new Blob([js], { type: "application/javascript" })
function WorkaroundWorker() {
  const objURL = URL.createObjectURL(blob)
  const worker = new Worker(new URL(objURL), { type: "module" })
  // worker.addEventListener("error", (e) => {
  //   URL.revokeObjectURL(objURL)
  // })
  const rpc = createBirpc<ServerFunctions>(
    {},
    {
      post: (data) => worker.postMessage(data),
      on: (data) => worker.addEventListener("message", (v) => data(v.data)),
      // these are required when using WebSocket
      // serialize: v => JSON.stringify(v),
      // deserialize: v => JSON.parse(v),
    },
  )
  return rpc
}

type Image = {
  status: "done" | "loading" | "error"
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

export type Formats =
  | "webp"
  | "jpeg"
  | "png"
  | "avif"
  | "heic"
  | "bmp"
  | "ico"
  | "tiff"
  | "pnm"
  | "tga"
  | "farbfeld"

const Converter = () => {
  const { convertedImages } = useSnapshot(state)
  const [targetFormat, setTargetFormat] = useState<MagickFormat>(MagickFormat.Png)
  const [quanlity, setQuanlity] = useState(85)

  const onFiles = (files: File[]) => {
    for (const file of files) {
      if (file.type.indexOf("image") === -1) {
        continue
      }
      ;(async function () {
        const instance = WorkaroundWorker()
        const index = state.convertedImages.push({
          status: "loading",
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
        const timer = setInterval(() => {
          if (state.convertedImages[index - 1].status !== "loading") {
            clearInterval(timer)
            return
          }
          state.convertedImages[index - 1].duration = Date.now() - start
        }, 300)
        try {
          const converted = await instance.convert(
            new Uint8Array(await file.arrayBuffer()),
            targetFormat,
            quanlity,
          )

          let blobType

          if (targetFormat === MagickFormat.Pdf) {
            blobType = "application/pdf"
          } else if (targetFormat === MagickFormat.Psd) {
            blobType = "application/psd"
          } else if (targetFormat === MagickFormat.WebP) {
            blobType = "image/webp"
          }

          const blob = new Blob([converted], {
            type: blobType,
          })
          const previewUrl = URL.createObjectURL(blob)
          // state.convertedImages[index - 1].previewUrl = previewUrl
          state.convertedImages[index - 1].previewUrl = previewUrl
          state.convertedImages[index - 1].convertedSize = blob.size
          state.convertedImages[index - 1].downloadUrl = URL.createObjectURL(blob)
          state.convertedImages[index - 1].sizeChange = ((file.size - blob.size) / file.size) * 100
          state.convertedImages[index - 1].status = "done"
          state.convertedImages[index - 1].format = targetFormat
          state.convertedImages[index - 1].duration = Date.now() - start
        } catch (e) {
          console.log("Error:", e)
          state.convertedImages[index - 1].status = "error"
        }
      })()
    }
  }

  return (
    <section id="image-converter" style={{ width: "100%", height: "100%" }}>
      <div className="flex gap-4 flex-col items-center light">
        <Toaster position="top-center" />
        <DropZone
          className={`w-full flex flex-col items-center justify-center drop-target:scale-125 transition-all`}
          onDrop={async (e) => {
            const files = e.items.filter((file) => file.kind === "file") as FileDropItem[]
            onFiles(await Promise.all(files.map((file) => file.getFile())))
          }}
        >
          <FileTrigger
            allowsMultiple
            // acceptDirectory
            onSelect={async (e) => {
              if (!e) {
                return
              }
              let files = Array.from(e)
              if (files.length === 0) {
                return
              }
              onFiles(files)
            }}
            acceptedFileTypes={["image/*"]}
          >
            <Button className="appearance-none inline-flex hover:shadow-2xl transition-all duration-300 hover:scale-110 dragging:bg-gray-500 items-center group space-x-2.5 bg-black text-white py-10 px-12 rounded-2xl cursor-pointer w-fit text-xl">
              Choose file or drag here
            </Button>
          </FileTrigger>
        </DropZone>
        <p className="text-sm text-gray-500 mt-4">
          Images are not uploaded to the server, they are converted directly in your browser.
        </p>
        <div className="flex gap-2 flex-col mt-10 mb-10">
          <h5>Select new format: </h5>
          <select
            value={targetFormat}
            onChange={(e) => setTargetFormat(e.target.value as MagickFormat)}
            className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm appearance-none"
          >
            {/* <option value={MagickFormat.WebP}>WebP</option> */}
            <option value={MagickFormat.Png}>PNG</option>
            <option value={MagickFormat.Jpeg}>JPEG</option>
            {/* <option value={MagickFormat.WebP}>WebP</option> */}
            <option value={MagickFormat.Heic}>HEIC</option>
            <option value={MagickFormat.Bmp}>BMP</option>
            <option value={MagickFormat.Ico}>ICO</option>
            <option value={MagickFormat.Tiff}>TIFF</option>
            <option value={MagickFormat.Pdf}>PDF</option>
          </select>
        </div>
        {/* <input
          type="number"
          min="0"
          max="100"
          value={quanlity}
          onChange={(e) => setQuanlity(+e.target.value)}
        /> */}
        <Table aria-label="Converted images" className={tableCls.table()}>
          <TableHeader className={tableCls.thead()}>
            <Column isRowHeader className={`${tableCls.th()} w-12 text-slate-800`}>
              No
            </Column>
            <Column className={`${tableCls.th()} w-32 text-slate-800`}>Status</Column>
            {/* <Column className={`${tableCls.th()} w-32`}>Name</Column> */}
            <Column className={`${tableCls.th()} w-40 text-slate-800`}>Image</Column>
            <Column className={`${tableCls.th()} w-32 text-slate-800`}>Size change</Column>
            <Column className={`${tableCls.th()} w-32 text-slate-800`}>Duration</Column>
            <Column className={`${tableCls.th()} text-slate-800`}>Actions</Column>
          </TableHeader>
          <TableBody className={tableCls.tbody()}>
            {convertedImages.map((image, index) => (
              <Row className={tableCls.tr()} key={index}>
                <Cell className={tableCls.td()}>{index + 1}</Cell>
                <Cell className={tableCls.td()}>
                  <AnimatePresence>
                    <motion.div
                      key={String(image.status)}
                      initial={{ y: 0 }}
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {image.status === "loading" && <Spinner />}
                      {image.status === "done" && "Done"}
                      {image.status === "error" && <span className="text-red-500">Error</span>}
                    </motion.div>
                  </AnimatePresence>
                </Cell>
                {/* <Cell className={tableCls.td()}>{image.filename}</Cell> */}
                <Cell className={tableCls.td()}>
                  <img
                    src={image.previewUrl}
                    alt="converted"
                    className="h-20 object-scale-down rounded-lg"
                  />
                </Cell>
                <Cell className={tableCls.td()}>
                  <motion.div key={image.sizeChange} animate={{ y: [0, -10, 0] }}>
                    {image.status !== "loading" &&
                      (image.sizeChange > 0 ? (
                        <span className="text-red-500">+{image.sizeChange.toFixed(2)}%</span>
                      ) : (
                        <span className="text-green-500">{image.sizeChange.toFixed(2)}%</span>
                      ))}
                  </motion.div>
                </Cell>
                <Cell className={`${tableCls.td()}`}>
                  <MotionNumber
                    value={image.duration / 1000}
                    format={{ style: "decimal", maximumFractionDigits: 2 }} // Intl.NumberFormat() options
                    locales="en-US" // Intl.NumberFormat() locales
                  />
                  s
                </Cell>
                <Cell className={tableCls.td()}>
                  <Button
                    isDisabled={image.status !== "done"}
                    onPress={() => {
                      const a = document.createElement("a")
                      a.href = image.downloadUrl
                      a.download =
                        image.filename.replace(/\.[^/.]+$/, "") + "." + targetFormat.toLowerCase()
                      a.click()
                    }}
                  >
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
