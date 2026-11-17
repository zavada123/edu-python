import { useEffect, useState } from "react"
import type { TkImage } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"

// Pictures of `PhotoImage`. The address of a picture is made here only from the bytes of a PNG or GIF file
// (the engine checked the type: `engine/images.ts`) or drawn on a canvas from the pixels of the program,
// so a picture cannot carry a script or a page.

const Base64 = /^[A-Za-z0-9+/]*={0,2}$/

const baseUrl = (image: TkImage): string | null =>
  image.base !== null && Base64.test(image.base.data) ? `data:${image.base.mime};base64,${image.base.data}` : null

const loadPicture = (url: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const picture = new Image()
    picture.onload = () => {
      resolve(picture)
    }
    picture.onerror = () => {
      resolve(null)
    }
    picture.src = url
  })

/** Rows of runs from `_images.py`: colour, count, colour, count… An empty colour is transparent. */
const paintPixels = (context: CanvasRenderingContext2D, pixels: ReadonlyArray<ReadonlyArray<string | number>>): void => {
  pixels.forEach((row, y) => {
    let x = 0
    for (let i = 0; i + 1 < row.length; i += 2) {
      const color = row[i]
      const count = Number(row[i + 1])
      if (typeof color === "string" && color !== "") {
        context.fillStyle = color
        context.fillRect(x, y, count, 1)
      }
      x += count
    }
  })
}

const drawImage = async (image: TkImage): Promise<string | null> => {
  const base = baseUrl(image)
  if (image.pixels === null) return base
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, image.width)
  canvas.height = Math.max(1, image.height)
  const context = canvas.getContext("2d")
  if (context === null) return base
  const picture = base === null ? null : await loadPicture(base)
  if (picture !== null) context.drawImage(picture, 0, 0)
  paintPixels(context, image.pixels)
  return canvas.toDataURL("image/png")
}

/** The address of a picture for `<img>` or SVG `<image>`; null while it is drawn or when there is none. */
export const useImageUrl = (id: number): { readonly url: string | null; readonly image: TkImage | undefined } => {
  const tk = useTk()
  const image = id === 0 ? undefined : tk.images.get(id)
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    if (image === undefined) {
      setUrl(null)
      return
    }
    void drawImage(image).then((found) => {
      if (live) setUrl(found)
    })
    return () => {
      live = false
    }
  }, [image])
  return { url, image }
}

/** A picture in a Label or a Button. */
export function TkPicture(props: Readonly<{ id: number }>) {
  const { url, image } = useImageUrl(props.id)
  if (image === undefined) return null
  const size = { width: image.shownWidth, height: image.shownHeight }
  if (url === null) return <span aria-hidden style={{ display: "inline-block", flex: "none", ...size }} />
  return <img src={url} alt="" draggable={false} style={{ display: "block", flex: "none", imageRendering: "pixelated", ...size }} />
}

/** A picture on the canvas: `x`, `y` and `anchor` as in Tk. */
export function TkCanvasPicture(props: Readonly<{ id: number; x: number; y: number; anchor: string; item: number }>) {
  const { url, image } = useImageUrl(props.id)
  if (image === undefined || url === null) return null
  const width = image.shownWidth
  const height = image.shownHeight
  const a = props.anchor
  const left = props.x - (a === "center" || a === "n" || a === "s" ? width / 2 : a.includes("e") ? width : 0)
  const top = props.y - (a === "center" || a === "e" || a === "w" ? height / 2 : a.startsWith("s") ? height : 0)
  return <image data-tk-item={props.item} href={url} x={left} y={top} width={width} height={height} preserveAspectRatio="none" style={{ imageRendering: "pixelated" }} />
}
