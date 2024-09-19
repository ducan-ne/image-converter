import { link, table } from "@nextui-org/theme"
import { useEffect, useState } from "react"
import { BlobWriter, BlobReader, ZipWriter } from "@zip.js/zip.js"
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
  type DirectoryDropItem,
  type FileDropItem,
} from "react-aria-components"
import { toast, Toaster } from "sonner"
import { Spinner } from "@nextui-org/react"
import { proxy, useSnapshot } from "valtio"
import { AnimatePresence, motion } from "framer-motion"
import workerUrl from "./converter-worker?worker&url"
import { createBirpc } from "birpc"
import MotionNumber from "motion-number"
import type { ServerFunctions } from "./converter-worker"

// classes
const tableCls = table()

const js = `import ${JSON.stringify(new URL(workerUrl, import.meta.url))}`
const blob = new Blob([js], { type: "application/javascript" })
function createWorker(onProgress: (progress: number) => void) {
  const objURL = URL.createObjectURL(blob)
  const worker = new Worker(new URL(objURL), { type: "module" })
  worker.addEventListener("error", () => {
    URL.revokeObjectURL(objURL)
  })
  const rpc = createBirpc<ServerFunctions>(
    {},
    {
      post: (data) => worker.postMessage(data),
      on: (data) => worker.addEventListener("message", (v) => data(v.data)),
      timeout: 60e3 * 5,
    },
  )
  worker.addEventListener("message", (e) => {
    if (e.data.type === "progress") {
      onProgress(e.data.progress)
    }
  })
  return [rpc, () => worker.terminate()] as const
}

type Image = {
  status: "done" | "loading" | "error"
  previewUrl: string
  downloadUrl: string
  originalSize: number
  convertedSize: number
  filename: string
  sizeChange: number // in %
  format: Formats
  duration: number
  progress: number
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
  const [targetFormat, setTargetFormat] = useState<Formats>("png")
  const [quanlity, setQuanlity] = useState(82)

  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      if (!e.clipboardData) {
        return
      }
      e.preventDefault()
      const files = [] as File[]
      for (const item of e.clipboardData.items) {
        if (item.kind === "file" && item.type.includes("image/")) {
          const file = item.getAsFile()
          if (file) {
            files.push(file)
          }
        }
      }
      onFiles(files)
    }
    document.addEventListener("paste", handler)
    return () => document.removeEventListener("paste", handler)
  }, [])

  const onFiles = (files: File[]) => {
    for (const file of files) {
      if (file.type.indexOf("image") === -1) {
        continue
      }
      ;(async function () {
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
          progress: 0,
        })
        let lastUpdate = 0
        const [instance, terminate] = createWorker((progress) => {
          const now = Date.now()
          if (now - lastUpdate >= 300) {
            row.progress = Math.round(progress)
            lastUpdate = now
          }
        })
        const start = Date.now()
        const row = state.convertedImages[index - 1]
        const timer = setInterval(() => {
          if (row.status !== "loading") {
            clearInterval(timer)
            return
          }
          row.duration = Date.now() - start
        }, 300)
        try {
          const converted = await instance.convert(
            new Uint8Array(await file.arrayBuffer()),
            file.name,
            targetFormat,
            quanlity,
          )

          const blob = new Blob([converted], { type: `image/${targetFormat}` })
          const previewUrl = URL.createObjectURL(blob)
          // state.convertedImages[index - 1].previewUrl = previewUrl
          row.previewUrl = previewUrl
          row.convertedSize = blob.size
          row.downloadUrl = URL.createObjectURL(blob)
          const from = file.size
          const to = blob.size
          
          row.sizeChange = -(((from - to) / from) * 100)
          row.status = "done"
          row.format = targetFormat
          row.duration = Date.now() - start
        } catch (e) {
          console.log("Error:", e)
          row.status = "error"
        } finally {
          terminate()
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
        <p className="text-sm text-gray-500 mt-2">Or upload a directory</p>
        <DropZone
          className={`w-full flex flex-col items-center justify-center drop-target:scale-125 transition-all`}
          onDrop={async (e) => {
            const files = e.items.filter((file) => file.kind === "directory") as DirectoryDropItem[]

            onFiles(
              (
                await Promise.all(
                  (
                    await Promise.all(files.map((file) => Array.fromAsync(file.getEntries())))
                  ).map((files) =>
                    Promise.all(
                      files.filter((file) => file.kind === "file").map((file) => file.getFile()),
                    ),
                  ),
                )
              ).flat(),
            )
          }}
        >
          <FileTrigger
            allowsMultiple
            acceptDirectory
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
              Choose directory or drag here
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
            onChange={(e) => setTargetFormat(e.target.value as Formats)}
            className="w-full p-4 border-2 border-gray-300 rounded-lg shadow-sm appearance-none"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
            <option value="heic">HEIC</option>
            <option value="bmp">BMP</option>
            <option value="ico">ICO</option>
            <option value="tiff">TIFF</option>
            {/* <option value={MagickFormat.Pdf}>PDF</option> */}
          </select>
        </div>
        {/* <input
          type="number"
          min="0"
          max="100"
          value={quanlity}
          onChange={(e) => setQuanlity(+e.target.value)}
        /> */}
        <div className="flex flex-col items-end justify-end w-full gap-3">
          <Button
            className="appearance-none inline-flex hover:shadow-2xl transition-all duration-300 dragging:bg-gray-500 items-center group space-x-2.5 bg-black text-white py-2 px-2.5 rounded-md cursor-pointer w-fit text-sm"
            onPress={async () => {
              const zipWriter = new ZipWriter(new BlobWriter("application/zip"))
              for (const image of state.convertedImages) {
                if (image.status === "done") {
                  const response = await fetch(image.downloadUrl)
                  const blob = await response.blob()
                  await zipWriter.add(
                    image.filename.replace(/\.[^/.]+$/, `.${targetFormat.toLowerCase()}`),
                    new BlobReader(blob),
                  )
                }
              }
              const zipBlob = await zipWriter.close()
              const downloadUrl = URL.createObjectURL(zipBlob)
              const a = document.createElement("a")
              a.href = downloadUrl
              a.download = "images.zip"
              a.click()
              URL.revokeObjectURL(downloadUrl)
            }}
          >
            Download as zip
          </Button>
        </div>
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
                      {image.status === "loading" && <Spinner label={`${image.progress}%`} />}
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
                  <div className="flex gap-6">
                    <Button
                      className={link}
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

                    <Button
                      className={link}
                      isDisabled={image.status !== "done"}
                      onPress={async () => {
                        const res = await fetch(image.downloadUrl)
                        const blob = await res.blob()

                        navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
                        toast.success("Copied to clipboard")
                      }}
                    >
                      Copy
                    </Button>
                  </div>
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
