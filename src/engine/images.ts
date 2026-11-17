/**
 * Pictures for `PhotoImage` (`tkinter/_images.py`): as Tk 8.6, the engine reads PNG and GIF files. The page
 * shows a picture only from these bytes (a `data:` address with the type found here), never from text that
 * the program gives: an SVG or HTML file is not a picture for it.
 */

export const ImageTypes = { Png: "image/png", Gif: "image/gif" } as const
export type ImageType = (typeof ImageTypes)[keyof typeof ImageTypes]

const PngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const GifSignatures = ["GIF87a", "GIF89a"]
/** Larger pictures are not shown: they would not fit the window anyway. */
const MaxSide = 4096

const startsWith = (bytes: Uint8Array, signature: ReadonlyArray<number>): boolean => signature.every((b, i) => bytes[i] === b)

const ascii = (bytes: Uint8Array, start: number, length: number): string => String.fromCharCode(...bytes.subarray(start, start + length))

const big32 = (bytes: Uint8Array, at: number): number => (((bytes[at] ?? 0) << 24) >>> 0) + ((bytes[at + 1] ?? 0) << 16) + ((bytes[at + 2] ?? 0) << 8) + (bytes[at + 3] ?? 0)
const little16 = (bytes: Uint8Array, at: number): number => (bytes[at] ?? 0) + ((bytes[at + 1] ?? 0) << 8)

export interface ImageInfo {
  readonly mime: ImageType
  readonly width: number
  readonly height: number
}

/** Type and size of a PNG or GIF file, or null. */
export const imageInfo = (bytes: Uint8Array): ImageInfo | null => {
  if (bytes.length >= 24 && startsWith(bytes, PngSignature) && ascii(bytes, 12, 4) === "IHDR") {
    return sized({ mime: ImageTypes.Png, width: big32(bytes, 16), height: big32(bytes, 20) })
  }
  if (bytes.length >= 10 && GifSignatures.includes(ascii(bytes, 0, 6))) {
    return sized({ mime: ImageTypes.Gif, width: little16(bytes, 6), height: little16(bytes, 8) })
  }
  return null
}

const sized = (info: ImageInfo): ImageInfo | null =>
  info.width > 0 && info.height > 0 && info.width <= MaxSide && info.height <= MaxSide ? info : null

const Chunk = 0x8000

export const toBase64 = (bytes: Uint8Array): string => {
  let binary = ""
  for (let i = 0; i < bytes.length; i += Chunk) binary += String.fromCharCode(...bytes.subarray(i, i + Chunk))
  return btoa(binary)
}

/** JSON for Python: type, size and base64 of the file; null when it is not a PNG or GIF picture. */
export const imageOf = (bytes: Uint8Array): string | null => {
  const info = imageInfo(bytes)
  return info === null ? null : JSON.stringify({ ...info, data: toBase64(bytes) })
}
