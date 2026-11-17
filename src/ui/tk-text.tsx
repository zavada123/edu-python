import { Option } from "effect"
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from "react"
import { TkIdAttribute } from "../core/tk-input.ts"
import type { TkScene, TkTextPart, TkWidget } from "../core/tk-scene.ts"
import { useTk } from "./tk-context.ts"
import { useWidgetEvents } from "./tk-events.ts"
import { border, LineHeight, useFieldText } from "./tk-field.ts"

// The Text widget: the field where the student types, and the coloured parts of the text (tags) under it.
// The text is transparent in the field and visible in the copy under it, so the student types in the field
// and sees the colours. The copy has the same font and the same wrapping; a tag changes only the weight and
// the slant of the font there, so the letters stay in place. A Text with `state="disabled"` shows the copy
// with the whole font of its tags.

/** The attribute of the element that a Scrollbar scrolls (`tk-lists.tsx`). */
export const TkScrollAttribute = "data-tk-scroll"

/** Places in the text: Python counts characters (code points), the browser counts UTF-16 units. */
export const toUnits = (text: string, chars: number): number => Array.from(text).slice(0, chars).join("").length
export const toChars = (text: string, units: number): number => Array.from(text.slice(0, units)).length

/** Is the widget scrolled by a Scrollbar of the program? Then its own scroll bar is hidden. */
export const scrolledByBar = (scene: TkScene, id: number): boolean =>
  scene.widgets.some((w) => Option.match(w.scroll, { onNone: () => false, onSome: (s) => s.target === id }))

/** "italic bold 16px/1.2 …": the slant and the weight of a CSS font. */
const slantAndWeight = (font: string): CSSProperties => {
  const words = font.split(" ")
  return { fontStyle: words[0] === "italic" ? "italic" : "normal", fontWeight: words[1] === "bold" ? "bold" : "normal" }
}

interface Piece {
  readonly text: string
  readonly part: TkTextPart | null
  readonly selected: boolean
}

/** The text cut at the edges of the tags and of the selection. */
const piecesOf = (text: string, parts: ReadonlyArray<TkTextPart>, selection: readonly [number, number] | null): ReadonlyArray<Piece> => {
  const chars = Array.from(text)
  const cuts = new Set([0, chars.length])
  for (const p of parts) {
    cuts.add(Math.min(p[0], chars.length))
    cuts.add(Math.min(p[1], chars.length))
  }
  if (selection !== null) {
    cuts.add(Math.min(selection[0], chars.length))
    cuts.add(Math.min(selection[1], chars.length))
  }
  const sorted = [...cuts].toSorted((a, b) => a - b)
  return sorted.slice(0, -1).map((start, i) => {
    const end = sorted[i + 1] ?? start
    return {
      text: chars.slice(start, end).join(""),
      part: parts.find((p) => p[0] <= start && end <= p[1]) ?? null,
      selected: selection !== null && selection[0] <= start && end <= selection[1] && selection[0] < selection[1]
    }
  })
}

function Copy(props: Readonly<{ text: string; parts: ReadonlyArray<TkTextPart>; selection: readonly [number, number] | null; selectionColor: string; fullFont: boolean }>): ReactNode {
  return (
    <>
      {piecesOf(props.text, props.parts, props.selection).map((piece, i) => {
        const p = piece.part
        const font: CSSProperties = p === null || p[4] === "" ? {} : props.fullFont ? { font: p[4] } : slantAndWeight(p[4])
        const style: CSSProperties = {
          ...font,
          color: p !== null && p[2] !== "" ? p[2] : undefined,
          background: piece.selected ? props.selectionColor : p !== null && p[3] !== "" ? p[3] : undefined,
          textDecoration: [p?.[5] === true ? "underline" : "", p?.[6] === true ? "line-through" : ""].join(" ").trim() || undefined
        }
        return <span key={i} style={style}>{piece.text}</span>
      })}
      {/* A newline at the end has a line after it, as in the field. */}
      {"​"}
    </>
  )
}

const wrapping = (w: TkWidget): CSSProperties => ({
  whiteSpace: w.textwrap === "none" ? "pre" : "pre-wrap",
  wordBreak: w.textwrap === "char" ? "break-all" : "normal",
  overflowWrap: w.textwrap === "none" ? "normal" : "anywhere"
})

export function TextView(props: Readonly<{ widget: TkWidget; layout: CSSProperties }>) {
  const tk = useTk()
  const events = useWidgetEvents(props.widget.id)
  const w = props.widget
  const [value, setValue] = useFieldText(w)
  const field = useRef<HTMLTextAreaElement>(null)
  const copy = useRef<HTMLDivElement>(null)
  const [focused, setFocused] = useState(false)
  const sent = useRef("")
  const style = Option.getOrNull(w.textStyle)
  const parts = style?.parts ?? []
  const selectionRev = useRef(style?.selectionRev ?? 0)
  const nativeBar = !scrolledByBar(tk.scene, w.id)

  // The program selected text or moved the cursor (tag_add(SEL…), mark_set(INSERT…)).
  useEffect(() => {
    const element = field.current
    if (style === null || element === null || style.selectionRev === selectionRev.current) return
    selectionRev.current = style.selectionRev
    element.setSelectionRange(toUnits(element.value, style.selection[0]), toUnits(element.value, style.selection[1]))
  }, [style])

  const box: CSSProperties = {
    boxSizing: "content-box",
    padding: `${w.pady}px ${w.padx}px`,
    width: `${Math.max(1, w.width)}ch`,
    height: `${Math.max(1, w.height) * LineHeight}em`,
    font: w.font,
    ...wrapping(w),
    scrollbarGutter: nativeBar ? "stable" : undefined,
    scrollbarWidth: nativeBar ? undefined : "none"
  }
  const outer: CSSProperties = {
    position: "relative",
    display: "flex",
    background: w.bg,
    color: w.fg,
    ...border(w.relief, w.bd),
    margin: w.highlight,
    font: w.font,
    ...props.layout
  }
  const selection: readonly [number, number] | null = style !== null && !focused ? style.selection : null
  const selectionColor = style?.selectionColor ?? "var(--tk-accent)"

  if (w.state === "disabled") {
    return (
      <div {...{ [TkIdAttribute]: w.id }} {...events} style={outer}>
        <div {...{ [TkScrollAttribute]: w.id }} role="textbox" aria-readonly aria-label="Текстове поле програми" style={{ ...box, flex: "1 1 auto", overflow: "auto" }}>
          <Copy text={value} parts={parts} selection={selection} selectionColor={selectionColor} fullFont />
        </div>
      </div>
    )
  }

  const coloured = parts.length > 0 || (selection !== null && selection[0] < selection[1])
  const sendSelection = (element: HTMLTextAreaElement): void => {
    const text = element.value
    const start = toChars(text, element.selectionStart)
    const end = toChars(text, element.selectionEnd)
    const caret = element.selectionDirection === "backward" ? start : end
    const key = `${start} ${end} ${caret}`
    if (!tk.active || key === sent.current) return
    sent.current = key
    tk.send({ _tag: "Selection", widget: w.id, start, end, caret })
  }
  const sendClipboard = (element: HTMLTextAreaElement): void => {
    if (tk.active) tk.send({ _tag: "Clipboard", text: element.value.slice(element.selectionStart, element.selectionEnd) })
  }

  return (
    <div {...{ [TkIdAttribute]: w.id }} {...events} style={outer}>
      {coloured && (
        <div ref={copy} aria-hidden style={{ ...box, position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          <Copy text={value} parts={parts} selection={selection} selectionColor={selectionColor} fullFont={false} />
        </div>
      )}
      <textarea
        ref={field}
        {...{ [TkScrollAttribute]: w.id }}
        aria-label="Текстове поле програми"
        value={value}
        readOnly={!tk.active}
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value)
          tk.send({ _tag: "Edit", widget: w.id, text: e.target.value })
        }}
        onSelect={(e) => {
          sendSelection(e.currentTarget)
        }}
        onCopy={(e) => {
          sendClipboard(e.currentTarget)
        }}
        onCut={(e) => {
          sendClipboard(e.currentTarget)
        }}
        onFocus={() => {
          setFocused(true)
        }}
        onBlur={() => {
          setFocused(false)
        }}
        onScroll={(e) => {
          if (copy.current !== null) {
            copy.current.scrollTop = e.currentTarget.scrollTop
            copy.current.scrollLeft = e.currentTarget.scrollLeft
          }
        }}
        style={{
          ...box,
          position: "relative",
          flex: "1 1 auto",
          minWidth: 0,
          margin: 0,
          border: 0,
          outline: "none",
          resize: "none",
          background: "transparent",
          color: coloured ? "transparent" : w.fg,
          caretColor: w.fg
        }}
      />
    </div>
  )
}
