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
import { MagickFormat } from "@imagemagick/magick-wasm"
import { Spinner } from "@nextui-org/react"
import { proxy, useSnapshot } from "valtio"
import { motion, AnimatePresence, Variants } from "framer-motion"
const tableCls = table()

const variants: Variants = {
  initial: (direction) => ({
    translateY: direction > 0 ? "40%" : "-80%",
    translateX: "-50%",
    opacity: 0,
    scale: 0.6,
    filter: "blur(2px)",
    transition: {
      translateY: { type: "spring", duration: 0.1 },
      translateX: { type: "spring", duration: 0.1 },
      opacity: { type: "spring", duration: 0.05 },
      scale: { type: "spring", duration: 0.1 },
      filter: { type: "spring", duration: 0.1 },
    },
  }),
  animate: {
    translateY: "-40%",
    translateX: "-40%",
    opacity: 1,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      translateY: { type: "spring", duration: 0.1 },
      translateX: { type: "spring", duration: 0.1 },
      opacity: { type: "spring", duration: 0.1 },
      scale: { type: "spring", duration: 0.1 },
      filter: { type: "spring", duration: 0.1 },
    },
  },
  exit: (direction) => ({
    translateY: direction > 0 ? "0%" : "40%",
    translateX: "-50%",
    opacity: 0,
    scale: 0.6,
    filter: "blur(2px)",
    transition: {
      translateY: { type: "spring", duration: 0.1 },
      translateX: { type: "spring", duration: 0.1 },
      opacity: { type: "spring", duration: 0.1 },
      scale: { type: "spring", duration: 0.1 },
      filter: { type: "spring", duration: 0.1 },
    },
  }),
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
  const [targetFormat, setTargetFormat] = useState<MagickFormat>(MagickFormat.Jpeg)
  const [quanlity, setQuanlity] = useState(85)

  return (
    <section id="image-converter" style={{ width: "100%", height: "100%" }}>
      <div className="flex gap-4 flex-col items-center light">
        <Toaster position="top-center" />
        <FileTrigger
          allowsMultiple
          // acceptDirectory
          onSelect={async (e) => {
            if (!e) return
            let files = Array.from(e)
            if (files.length === 0) return
            for (const file of files) {
              if (file.type.indexOf("image") === -1) {
                continue
              }
              ;(async function () {
                const instance = new ComlinkWorker<typeof import("./converter-worker2.ts")>(
                  new URL("./converter-worker2.ts", import.meta.url),
                )
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

                  const blob = new Blob([converted])
                  const previewUrl = URL.createObjectURL(blob)
                  // state.convertedImages[index - 1].previewUrl = previewUrl
                  state.convertedImages[index - 1].previewUrl = previewUrl
                  state.convertedImages[index - 1].convertedSize = blob.size
                  state.convertedImages[index - 1].downloadUrl = URL.createObjectURL(blob)
                  state.convertedImages[index - 1].sizeChange =
                    ((file.size - blob.size) / file.size) * 100
                  state.convertedImages[index - 1].status = "done"
                  state.convertedImages[index - 1].format = targetFormat
                  state.convertedImages[index - 1].duration = Date.now() - start
                } catch (e) {
                  console.log("Error:", e)
                  state.convertedImages[index - 1].status = "error"
                }
              })()
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
          onChange={(e) => setTargetFormat(e.target.value as MagickFormat)}
          className="w-full"
        >
          {/* <option value={MagickFormat.WebP}>WebP</option> */}
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
        <input
          type="number"
          min="0"
          max="100"
          value={quanlity}
          onChange={(e) => setQuanlity(+e.target.value)}
        />
        <Table aria-label="Converted images" className={tableCls.table()}>
          <TableHeader className={tableCls.thead()}>
            <Column isRowHeader className={`${tableCls.th()} w-12`}>
              No
            </Column>
            <Column className={`${tableCls.th()} w-32`}>Status</Column>
            <Column className={`${tableCls.th()} w-32`}>Name</Column>
            <Column className={`${tableCls.th()} w-40`}>Image</Column>
            <Column className={`${tableCls.th()} w-32`}>Size change</Column>
            <Column className={`${tableCls.th()} w-32`}>Duration</Column>
            <Column className={`${tableCls.th()}`}>Actions</Column>
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
                      {image.status === "error" && "Error"}
                    </motion.div>
                  </AnimatePresence>
                </Cell>
                <Cell className={tableCls.td()}>{image.filename}</Cell>
                <Cell className={tableCls.td()}>
                  <img
                    src={image.previewUrl}
                    alt="converted"
                    className="h-20 object-scale-down rounded-lg"
                  />
                </Cell>
                <Cell className={tableCls.td()}>
                  <motion.div key={image.sizeChange} animate={{ y: -10 }}>
                    {image.status !== "loading" &&
                      (image.sizeChange > 0 ? (
                        <span className="text-red-500">+{image.sizeChange.toFixed(2)}%</span>
                      ) : (
                        <span className="text-green-500">{image.sizeChange.toFixed(2)}%</span>
                      ))}
                  </motion.div>
                </Cell>
                <Cell className={`${tableCls.td()}`}>
                  <div className="tabular-nums flex w-full items-center">
                    {((image.duration / 1000).toFixed(2) + "s").split("").map((digit, index) => (
                      <div key={index} className="w-[0.53rem] relative select-none">
                        <AnimatePresence initial={false} custom={1}>
                          <motion.span
                            key={digit}
                            className="absolute translate-x-1/2 translate-y-1/2 left-1/2 top-1/2 z-10"
                            variants={variants}
                            animate="animate"
                            initial="initial"
                            exit="exit"
                            custom={1}
                          >
                            {digit}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
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
