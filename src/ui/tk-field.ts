import { type CSSProperties, useState } from "react"
import { Match } from "effect"
import type { TkWidget } from "../core/tk-scene.ts"

// What the widgets of a window share: borders (relief), anchors, the box of a text and the text of a field.

/** Line height of Tk fonts; the fonts of `_style.py` have the same `/1.2`. */
export const LineHeight = 1.2
const Light = "var(--tk-paper)"
const Shadow = "var(--tk-shadow)"

export const border = (relief: string, width: number): CSSProperties => {
  if (width <= 0) return { borderWidth: 0, borderStyle: "none" }
  const raised = { borderWidth: width, borderStyle: "solid", borderColor: `${Light} ${Shadow} ${Shadow} ${Light}` }
  return Match.value(relief).pipe(
    Match.when("raised", () => raised),
    Match.when("sunken", () => ({ ...raised, borderColor: `${Shadow} ${Light} ${Light} ${Shadow}` })),
    Match.when("groove", () => ({ borderWidth: width, borderStyle: "groove", borderColor: Shadow })),
    Match.when("ridge", () => ({ borderWidth: width, borderStyle: "ridge", borderColor: Shadow })),
    Match.when("solid", () => ({ borderWidth: width, borderStyle: "solid", borderColor: "var(--tk-text)" })),
    Match.orElse(() => ({ borderWidth: width, borderStyle: "solid", borderColor: "transparent" }))
  )
}

/** CSS alignment of a Tk anchor: n, ne, e, se, s, sw, w, nw, center. */
export const anchorX = (anchor: string): string =>
  anchor === "center" ? "center" : anchor.includes("w") ? "flex-start" : anchor.includes("e") ? "flex-end" : "center"
export const anchorY = (anchor: string): string =>
  anchor === "center" ? "center" : anchor.startsWith("n") ? "flex-start" : anchor.startsWith("s") ? "flex-end" : "center"

export const textBox = (w: TkWidget): CSSProperties => ({
  boxSizing: "content-box",
  font: w.font,
  color: w.fg,
  background: w.bg === "" ? "transparent" : w.bg,
  ...border(w.relief, w.bd),
  padding: `${w.pady}px ${w.padx}px`,
  margin: w.highlight,
  width: w.width > 0 ? `${w.width}ch` : undefined,
  height: w.height > 0 ? `${w.height * LineHeight}em` : undefined,
  display: "flex",
  justifyContent: anchorX(w.anchor),
  alignItems: anchorY(w.anchor),
  textAlign: w.justify === "left" ? "left" : w.justify === "right" ? "right" : "center",
  whiteSpace: w.wrap > 0 ? "pre-wrap" : "pre",
  overflow: "hidden",
  textDecoration: w.underline ? "underline" : undefined,
  userSelect: "none",
  ...(w.cursor === "" ? {} : { cursor: w.cursor })
})

/** Text of a field: the student types it, and the program changes it (`rev`). */
export const useFieldText = (w: TkWidget): readonly [string, (value: string) => void] => {
  const [value, setValue] = useState(w.text)
  const [rev, setRev] = useState(w.rev)
  if (rev !== w.rev) {
    setRev(w.rev)
    setValue(w.text)
  }
  return [value, setValue]
}

export const fieldStyle = (w: TkWidget): CSSProperties => ({
  boxSizing: "content-box",
  font: w.font,
  color: w.fg,
  background: w.bg,
  ...border(w.relief, w.bd),
  margin: w.highlight,
  padding: "1px 2px",
  outline: "none",
  textAlign: w.justify === "right" ? "right" : w.justify === "center" ? "center" : "left",
  ...(w.caret === "" ? {} : { caretColor: w.caret }),
  ...(w.cursor === "" ? {} : { cursor: w.cursor })
})

